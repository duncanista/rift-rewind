'''
AWS Lambda handler for processing a single match.
This lambda is triggered by SQS and processes one match at a time.
'''

import json
import os
from typing import Dict, Any
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

from lib.riot_api import RiotAPIClient
from lib.match_analyzer import MatchAnalyzer
from lib.aws_utils import get_secret_from_secrets_manager
from lib.rate_limit_handler import make_request_with_retry
import requests

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb_client = boto3.client('dynamodb')
lambda_client = boto3.client('lambda')


def match_exists_in_s3(bucket_name: str, match_id: str) -> bool:
    """Check if match data already exists in S3."""
    try:
        key = f"matches/{match_id}.json"
        s3_client.head_object(Bucket=bucket_name, Key=key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        raise


def store_match_in_s3(bucket_name: str, match_id: str, match_data: Dict[str, Any]) -> bool:
    """Store full match data in S3."""
    try:
        key = f"matches/{match_id}.json"
        s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=json.dumps(match_data),
            ContentType='application/json'
        )
        return True
    except Exception as e:
        print(f"Error storing match in S3: {str(e)}")
        return False


def store_user_match_details(bucket_name: str, puuid: str, match_id: str, match_data: Dict[str, Any]) -> bool:
    """Store user-specific match data in S3."""
    try:
        # Extract user's participant data
        participant_data = None
        for participant in match_data.get('info', {}).get('participants', []):
            if participant.get('puuid') == puuid:
                participant_data = participant
                break
        
        if not participant_data:
            print(f"User {puuid} not found in match {match_id}")
            return False
        
        # Create user match details
        match_analyzer = MatchAnalyzer(puuid, match_data)
        user_match_details = {
            'match_id': match_id,
            'puuid': puuid,
            'game_creation': match_data.get('info', {}).get('gameCreation'),
            'game_duration': match_data.get('info', {}).get('gameDuration'),
            'platform_id': match_data.get('info', {}).get('platformId'),
            'queue_id': match_data.get('info', {}).get('queueId'),
            'match_data': match_analyzer.get_match_data()
        }
        
        key = f"users/{puuid}/match-details/{match_id}.json"
        s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=json.dumps(user_match_details),
            ContentType='application/json'
        )
        return True
    except Exception as e:
        print(f"Error storing user match details: {str(e)}")
        return False


def update_user_matches_list(bucket_name: str, puuid: str, match_id: str) -> bool:
    """
    Update user's matches.json file with new match ID.
    Note: This still has race conditions but is kept for backward compatibility.
    The source of truth for processed count is now in DynamoDB.
    """
    try:
        key = f"users/{puuid}/matches.json"
        
        # Try to get existing matches list
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=key)
            matches_data = json.loads(response['Body'].read().decode('utf-8'))
            match_ids = matches_data.get('match_ids', [])
            processed_match_ids = matches_data.get('processed_match_ids', [])
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                match_ids = []
                processed_match_ids = []
            else:
                raise
        
        # Add match_id if not already present
        if match_id not in match_ids:
            match_ids.append(match_id)
        
        # Add to processed list if not already there
        if match_id not in processed_match_ids:
            processed_match_ids.append(match_id)
        
        # Update matches.json
        matches_data = {
            'puuid': puuid,
            'match_ids': match_ids,
            'processed_match_ids': processed_match_ids,
            'last_updated': datetime.now(timezone.utc).isoformat(),
            'total_matches': len(match_ids),
            'processed_count': len(processed_match_ids)
        }
        
        s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=json.dumps(matches_data),
            ContentType='application/json'
        )
        return True
    except Exception as e:
        print(f"Error updating user matches list: {str(e)}")
        return False


def increment_processed_count_atomic(table_name: str, puuid: str, match_id: str) -> Dict[str, Any]:
    """
    Atomically increment the processed match count in DynamoDB.
    Returns the updated item with the new count.
    """
    try:
        response = dynamodb_client.update_item(
            TableName=table_name,
            Key={'puuid': {'S': puuid}},
            UpdateExpression='ADD processed_count :inc SET last_processed_match = :match_id, last_updated = :timestamp',
            ExpressionAttributeValues={
                ':inc': {'N': '1'},
                ':match_id': {'S': match_id},
                ':timestamp': {'S': datetime.now(timezone.utc).isoformat()}
            },
            ReturnValues='ALL_NEW'
        )
        
        item = response.get('Attributes', {})
        return {
            'processed_count': int(item.get('processed_count', {}).get('N', 0)),
            'total_matches': int(item.get('total_matches', {}).get('N', 0))
        }
    except Exception as e:
        print(f"Error incrementing processed count: {str(e)}")
        raise


def update_match_index_table(table_name: str, match_id: str, match_data: Dict[str, Any]) -> bool:
    """Update DynamoDB match index table with match participants."""
    try:
        # Extract participant PUUIDs
        participants = []
        for participant in match_data.get('info', {}).get('participants', []):
            puuid = participant.get('puuid')
            if puuid:
                participants.append(puuid)
        
        # Store in DynamoDB
        dynamodb_client.put_item(
            TableName=table_name,
            Item={
                'match_id': {'S': match_id},
                'participants': {'SS': participants},
                'platform_id': {'S': match_data.get('info', {}).get('platformId', '')},
                'game_creation': {'N': str(match_data.get('info', {}).get('gameCreation', 0))},
                'processed_at': {'S': datetime.now(timezone.utc).isoformat()}
            }
        )
        return True
    except Exception as e:
        print(f"Error updating match index table: {str(e)}")
        return False


def get_match_with_retry(client: RiotAPIClient, match_id: str) -> Dict[str, Any]:
    """Get match data with rate limit retry handling."""
    def make_request():
        match_path = f"https://{client.routing}.api.riotgames.com/lol/match/v5/matches/{match_id}?api_key={client.api_key}"
        return requests.get(match_path)
    
    response = make_request_with_retry(make_request, max_retries=15, retry_delay_ms=2000)
    return response.json()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for processing a single match (SQS-triggered).
    
    Expected SQS event format:
    {
        "Records": [
            {
                "body": "{\"puuid\": \"...\", \"match_id\": \"...\", \"summoner_name\": \"...\", \"summoner_tagline\": \"...\", \"region\": \"...\"}"
            }
        ]
    }
    """
    import time
    import random
    
    # Add a small random delay to spread out requests and avoid rate limits
    # This helps when multiple Lambdas start simultaneously
    delay = random.uniform(0.1, 0.5)
    time.sleep(delay)
    
    try:
        # Get environment variables
        secret_arn = os.environ.get('RIOT_API_KEY_SECRET_ARN')
        bucket_name = os.environ.get('DATA_BUCKET_NAME')
        match_index_table = os.environ.get('MATCH_INDEX_TABLE_NAME')
        
        if not all([secret_arn, bucket_name, match_index_table]):
            print("Missing required environment variables")
            return {'statusCode': 500}
        
        # Get API key
        try:
            api_key = get_secret_from_secrets_manager(secret_arn)
        except Exception as e:
            print(f"Failed to retrieve API key: {str(e)}")
            return {'statusCode': 500}
        
        # Parse SQS message
        if 'Records' not in event or len(event['Records']) == 0:
            print("No records in event")
            return {'statusCode': 400}
        
        message_body = json.loads(event['Records'][0]['body'])
        puuid = message_body.get('puuid')
        match_id = message_body.get('match_id')
        region = message_body.get('region', 'americas')
        
        if not all([puuid, match_id]):
            print("Missing required fields in message")
            return {'statusCode': 400}
        
        print(f"Processing match {match_id} for user {puuid}")
        
        # Initialize Riot API client
        client = RiotAPIClient(api_key, region=region)
        
        # Check if match already exists in S3
        if match_exists_in_s3(bucket_name, match_id):
            # Load from S3
            try:
                response = s3_client.get_object(Bucket=bucket_name, Key=f"matches/{match_id}.json")
                match_data = json.loads(response['Body'].read().decode('utf-8'))
                print(f"Loaded match {match_id} from S3")
            except Exception as e:
                print(f"Error loading match from S3: {str(e)}")
                # Fetch from API if S3 load fails
                match_data = get_match_with_retry(client, match_id)
                store_match_in_s3(bucket_name, match_id, match_data)
        else:
            # Fetch from API with retry handling
            try:
                match_data = get_match_with_retry(client, match_id)
                store_match_in_s3(bucket_name, match_id, match_data)
            except Exception as e:
                print(f"Failed to fetch match {match_id} after retries: {str(e)}")
                raise  # Re-raise to trigger SQS retry
        
        # Update match index table
        update_match_index_table(match_index_table, match_id, match_data)
        
        # Store user-specific match details
        store_user_match_details(bucket_name, puuid, match_id, match_data)
        
        # Update user matches list (for backward compatibility, but not source of truth)
        update_user_matches_list(bucket_name, puuid, match_id)
        
        # Atomically increment processed count in DynamoDB
        user_insights_table = os.environ.get('USER_INSIGHTS_TABLE_NAME')
        if not user_insights_table:
            print("USER_INSIGHTS_TABLE_NAME not set")
            return {'statusCode': 500}
        
        try:
            counts = increment_processed_count_atomic(user_insights_table, puuid, match_id)
            processed_count = counts['processed_count']
            total_matches = counts['total_matches']
            
            print(f"Progress for user {puuid}: {processed_count}/{total_matches} matches processed")
            
            # If all matches are processed, trigger aggregation
            if processed_count >= total_matches and total_matches > 0:
                print(f"All matches processed for user {puuid}. Triggering aggregation...")
                # Invoke aggregate_user Lambda
                aggregate_function_name = os.environ.get('AGGREGATE_USER_FUNCTION_NAME')
                if aggregate_function_name:
                    try:
                        lambda_client.invoke(
                            FunctionName=aggregate_function_name,
                            InvocationType='Event',  # Async invocation
                            Payload=json.dumps({'puuid': puuid})
                        )
                        print(f"Triggered aggregation for user {puuid}")
                    except Exception as e:
                        print(f"Error triggering aggregation: {str(e)}")
        except Exception as e:
            print(f"Error updating processed count: {str(e)}")
            # Don't fail the Lambda if this fails - match is still processed
        
        print(f"Successfully processed match {match_id} for user {puuid}")
        return {'statusCode': 200}
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'statusCode': 500}

