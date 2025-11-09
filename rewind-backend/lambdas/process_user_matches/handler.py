'''
AWS Lambda handler for processing all matches for a user.
This lambda is triggered by SQS and processes all matches from the past year,
stores them in S3, and updates aggregated data.
'''

import json
import os
from typing import Dict, Any
from datetime import datetime, timezone
import boto3

from lib.riot_api import RiotAPIClient
from lib.aws_utils import get_secret_from_secrets_manager

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb_client = boto3.client('dynamodb')
sqs_client = boto3.client('sqs')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for processing user matches (SQS-triggered).
    
    Expected SQS event format:
    {
        "Records": [
            {
                "body": "{\"puuid\": \"...\", \"summoner_name\": \"...\", \"summoner_tagline\": \"...\", \"region\": \"...\"}"
            }
        ]
    }
    """
    try:
        # Get environment variables
        secret_arn = os.environ.get('RIOT_API_KEY_SECRET_ARN')
        bucket_name = os.environ.get('DATA_BUCKET_NAME')
        user_insights_table = os.environ.get('USER_INSIGHTS_TABLE_NAME')
        match_index_table = os.environ.get('MATCH_INDEX_TABLE_NAME')
        
        if not all([secret_arn, bucket_name, user_insights_table, match_index_table]):
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
        summoner_name = message_body.get('summoner_name')
        summoner_tagline = message_body.get('summoner_tagline')
        region = message_body.get('region', 'americas')
        
        if not all([puuid, summoner_name, summoner_tagline]):
            print("Missing required fields in message")
            return {'statusCode': 400}
        
        print(f"Processing matches for user: {summoner_name}#{summoner_tagline} (PUUID: {puuid})")
        
        # Initialize Riot API client
        client = RiotAPIClient(api_key, region=region)
        
        # Fetch all matches using pagination
        all_match_ids = []
        start = 0
        batch_size = 100
        
        try:
            while True:
                match_ids = client.get_matches(puuid, start=start, count=batch_size)
                
                if not match_ids:
                    # No more matches
                    break
                
                all_match_ids.extend(match_ids)
                
                # If we got fewer matches than requested, we've reached the end
                if len(match_ids) < batch_size:
                    break
                
                # Move to next batch
                start += batch_size
                
        except Exception as e:
            print(f"Failed to fetch matches: {str(e)}")
            return {'statusCode': 500}
        
        if not all_match_ids:
            print(f"No matches found for user {puuid}")
            # Mark as complete even with no matches
            store_aggregated_data(bucket_name, user_insights_table, puuid, {
                'match_count': 0,
                'matches': []
            })
            return {'statusCode': 200}
        
        print(f"Found {len(all_match_ids)} total matches to queue")
        
        # Store match IDs in S3 for reference
        matches_key = f"users/{puuid}/matches.json"
        matches_data = {
            'puuid': puuid,
            'match_ids': all_match_ids,
            'total_matches': len(all_match_ids),
            'queued_at': datetime.now(timezone.utc).isoformat(),
            'status': 'queued'
        }
        s3_client.put_object(
            Bucket=bucket_name,
            Key=matches_key,
            Body=json.dumps(matches_data),
            ContentType='application/json'
        )
        
        # Queue each match ID for individual processing
        match_processing_queue_url = os.environ.get('MATCH_PROCESSING_QUEUE_URL')
        if not match_processing_queue_url:
            print("MATCH_PROCESSING_QUEUE_URL not configured")
            return {'statusCode': 500}
        
        queued_count = 0
        for match_id in all_match_ids:
            try:
                message = {
                    'puuid': puuid,
                    'match_id': match_id,
                    'summoner_name': summoner_name,
                    'summoner_tagline': summoner_tagline,
                    'region': region
                }
                
                sqs_client.send_message(
                    QueueUrl=match_processing_queue_url,
                    MessageBody=json.dumps(message)
                )
                queued_count += 1
            except Exception as e:
                print(f"Error queueing match {match_id}: {str(e)}")
                continue
        
        # Update DynamoDB status
        try:
            dynamodb_client.put_item(
                TableName=user_insights_table,
                Item={
                    'puuid': {'S': puuid},
                    'status': {'S': 'processing'},
                    'total_matches': {'N': str(len(all_match_ids))},
                    'queued_at': {'S': matches_data['queued_at']}
                }
            )
        except Exception as e:
            print(f"Error updating DynamoDB status: {str(e)}")
        
        print(f"Successfully queued {queued_count} matches for user {puuid}")
        return {'statusCode': 200}
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'statusCode': 500}

