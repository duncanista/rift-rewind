'''
AWS Lambda handler for aggregating user matches.
This lambda checks if all matches are processed and aggregates them.
Can be triggered periodically or after match processing.
'''

import json
import os
from typing import Dict, Any, List, Tuple
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

from lib.match_data_aggregator import MatchDataAggregator
from lib.aws_utils import get_secret_from_secrets_manager

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb_client = boto3.client('dynamodb')


def check_all_matches_processed(bucket_name: str, puuid: str, table_name: str) -> Tuple[bool, List[str]]:
    """
    Check if all matches for a user have been processed.
    Uses DynamoDB as source of truth for processed count.
    
    Returns:
        (all_processed: bool, match_ids: List[str])
    """
    try:
        # Get match IDs from S3
        key = f"users/{puuid}/matches.json"
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        matches_data = json.loads(response['Body'].read().decode('utf-8'))
        match_ids = matches_data.get('match_ids', [])
        
        # Get processed count from DynamoDB (source of truth)
        try:
            response = dynamodb_client.get_item(
                TableName=table_name,
                Key={'puuid': {'S': puuid}}
            )
            
            if 'Item' in response:
                item = response['Item']
                processed_count = int(item.get('processed_count', {}).get('N', 0))
                total_matches = int(item.get('total_matches', {}).get('N', 0))
                
                all_processed = processed_count >= total_matches and total_matches > 0
                print(f"DynamoDB check: {processed_count}/{total_matches} matches processed")
                return all_processed, match_ids
        except Exception as e:
            print(f"Error checking DynamoDB: {str(e)}")
        
        # Fallback to S3 if DynamoDB check fails
        processed_match_ids = matches_data.get('processed_match_ids', [])
        all_processed = len(processed_match_ids) == len(match_ids) and len(match_ids) > 0
        return all_processed, match_ids
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            return False, []
        raise


def load_match_data_from_s3(bucket_name: str, match_id: str) -> Dict[str, Any]:
    """Load match data from S3."""
    try:
        key = f"matches/{match_id}.json"
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        return json.loads(response['Body'].read().decode('utf-8'))
    except Exception as e:
        print(f"Error loading match {match_id} from S3: {str(e)}")
        raise


def store_aggregated_data(bucket_name: str, table_name: str, puuid: str, aggregated_data: Dict[str, Any]) -> bool:
    """Store aggregated data in S3 and DynamoDB."""
    try:
        # Add metadata
        aggregated_data['last_updated'] = datetime.now(timezone.utc).isoformat()
        aggregated_data['puuid'] = puuid
        
        # Store in S3
        key = f"users/{puuid}/aggregated.json"
        s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=json.dumps(aggregated_data),
            ContentType='application/json'
        )
        
        # Store in DynamoDB
        dynamodb_client.put_item(
            TableName=table_name,
            Item={
                'puuid': {'S': puuid},
                'status': {'S': 'complete'},
                'last_updated': {'S': aggregated_data['last_updated']},
                'match_count': {'N': str(aggregated_data.get('match_count', 0))}
            }
        )
        
        return True
    except Exception as e:
        print(f"Error storing aggregated data: {str(e)}")
        return False


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for aggregating user matches.
    
    Can be triggered by:
    - EventBridge (periodic check)
    - SQS message from process_match Lambda
    - Direct invocation
    
    Expected event format:
    {
        "puuid": "..."
    }
    Or SQS:
    {
        "Records": [
            {
                "body": "{\"puuid\": \"...\"}"
            }
        ]
    }
    """
    try:
        # Get environment variables
        bucket_name = os.environ.get('DATA_BUCKET_NAME')
        user_insights_table = os.environ.get('USER_INSIGHTS_TABLE_NAME')
        
        if not all([bucket_name, user_insights_table]):
            print("Missing required environment variables")
            return {'statusCode': 500}
        
        # Parse event to get PUUID
        puuid = None
        
        if 'Records' in event and len(event['Records']) > 0:
            # SQS event
            message_body = json.loads(event['Records'][0]['body'])
            puuid = message_body.get('puuid')
        elif 'puuid' in event:
            # Direct invocation
            puuid = event['puuid']
        
        if not puuid:
            print("Missing puuid in event")
            return {'statusCode': 400}
        
        print(f"Checking aggregation for user {puuid}")
        
        # Check if all matches are processed
        all_processed, match_ids = check_all_matches_processed(bucket_name, puuid, user_insights_table)
        
        if not all_processed:
            print(f"Not all matches processed yet for user {puuid}")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'in_progress',
                    'message': 'Not all matches processed yet'
                })
            }
        
        print(f"All matches processed. Aggregating {len(match_ids)} matches")
        
        # Load all match data from S3
        match_data_list = []
        for match_id in match_ids:
            try:
                match_data = load_match_data_from_s3(bucket_name, match_id)
                match_data_list.append(match_data)
            except Exception as e:
                print(f"Error loading match {match_id}: {str(e)}")
                continue
        
        if not match_data_list:
            print(f"No match data found for user {puuid}")
            store_aggregated_data(bucket_name, user_insights_table, puuid, {
                'match_count': 0,
                'kills': 0,
                'deaths': 0,
                'assists': 0,
                'pings': {},
                'champions': {},
                'positions': {}
            })
            return {'statusCode': 200}
        
        # Aggregate all matches
        aggregator = MatchDataAggregator(puuid, match_data_list)
        aggregated_data = aggregator.aggregated_data
        aggregated_data['match_count'] = len(match_data_list)
        
        # Store aggregated data
        store_aggregated_data(bucket_name, user_insights_table, puuid, aggregated_data)
        
        print(f"Successfully aggregated {len(match_data_list)} matches for user {puuid}")
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'complete',
                'match_count': len(match_data_list)
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'statusCode': 500}

