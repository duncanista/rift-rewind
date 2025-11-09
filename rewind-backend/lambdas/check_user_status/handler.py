'''
AWS Lambda handler for checking if user data is processed.
This lambda checks if a user's match data has been fully processed,
and if not, queues the user for processing.
'''

import json
import os
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

from lib.riot_api import RiotAPIClient
from lib.aws_utils import get_secret_from_secrets_manager

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb_client = boto3.client('dynamodb')
sqs_client = boto3.client('sqs')


def check_user_processed(puuid: str, bucket_name: str, table_name: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Check if user data has been fully processed.
    
    Returns:
        (is_processed: bool, aggregated_data: Optional[Dict])
    """
    try:
        # Check S3 for aggregated data
        aggregated_key = f"users/{puuid}/aggregated.json"
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=aggregated_key)
            aggregated_data = json.loads(response['Body'].read().decode('utf-8'))
            # If aggregated data exists, user is processed
            return True, aggregated_data
        except ClientError as e:
            if e.response['Error']['Code'] != 'NoSuchKey':
                print(f"Error checking S3: {str(e)}")
        
        # Check DynamoDB for processing status
        try:
            response = dynamodb_client.get_item(
                TableName=table_name,
                Key={'puuid': {'S': puuid}}
            )
            
            if 'Item' in response:
                item = response['Item']
                status = item.get('status', {}).get('S')
                if status == 'complete':
                    # Try to get aggregated data from S3
                    try:
                        aggregated_key = f"users/{puuid}/aggregated.json"
                        response = s3_client.get_object(Bucket=bucket_name, Key=aggregated_key)
                        aggregated_data = json.loads(response['Body'].read().decode('utf-8'))
                        return True, aggregated_data
                    except:
                        pass
        except ClientError as e:
            print(f"Error checking DynamoDB: {str(e)}")
        
        return False, None
    except Exception as e:
        print(f"Error checking user processed status: {str(e)}")
        return False, None


def queue_user_for_processing(puuid: str, summoner_name: str, summoner_tagline: str, region: str, queue_url: str) -> bool:
    """Queue a user for processing."""
    try:
        message = {
            'puuid': puuid,
            'summoner_name': summoner_name,
            'summoner_tagline': summoner_tagline,
            'region': region,
            'requested_at': datetime.now(timezone.utc).isoformat()
        }
        
        sqs_client.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(message)
        )
        
        return True
    except Exception as e:
        print(f"Error queueing user for processing: {str(e)}")
        return False


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for checking user status via Lambda Function URL.
    
    Expected Lambda Function URL event format:
    - Query parameters: ?summoner=name%23tagline&region=la1
    - POST body: {"summoner": "name#tagline", "region": "la1"}
    
    Returns:
    - If processed: aggregated data
    - If not processed: {"status": "processing", "message": "..."}
    """
    try:
        # Get environment variables
        secret_arn = os.environ.get('RIOT_API_KEY_SECRET_ARN')
        bucket_name = os.environ.get('DATA_BUCKET_NAME')
        table_name = os.environ.get('USER_INSIGHTS_TABLE_NAME')
        queue_url = os.environ.get('USER_PROCESSING_QUEUE_URL')
        
        if not all([secret_arn, bucket_name, table_name, queue_url]):
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Missing required environment variables'})
            }
        
        # Get API key
        try:
            api_key = get_secret_from_secrets_manager(secret_arn)
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Failed to retrieve API key: {str(e)}'})
            }
        
        # Parse event to get summoner name, tagline, and region
        summoner_string = None
        region = None
        
        if 'queryStringParameters' in event and event['queryStringParameters']:
            summoner_string = event['queryStringParameters'].get('summoner')
            region = event['queryStringParameters'].get('region')
        elif 'body' in event and event['body']:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            summoner_string = body.get('summoner')
            region = body.get('region')
        elif 'summoner' in event:
            summoner_string = event.get('summoner')
            region = event.get('region')
        
        if not summoner_string:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing summoner parameter. Expected format: "name#tagline"'
                })
            }
        
        if '#' not in summoner_string:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid summoner format. Expected format: "name#tagline"'})
            }
        
        summoner_name, summoner_tagline = summoner_string.split('#', 1)
        
        # Default to 'americas' if no region specified
        if not region:
            region = 'americas'
        
        print(f"Checking status for summoner: {summoner_name}#{summoner_tagline}, region: {region}")
        
        # Initialize Riot API client
        client = RiotAPIClient(api_key, region=region)
        
        # Create a cache key from summoner name, tagline, and region
        # Format: "name#tagline#region" (lowercase for case-insensitive lookup)
        summoner_key = f"{summoner_name}#{summoner_tagline}#{region}".lower()
        
        # Try to get PUUID from cache first (DynamoDB GSI lookup)
        puuid = None
        try:
            response = dynamodb_client.query(
                TableName=table_name,
                IndexName='summoner-lookup-index',
                KeyConditionExpression='summoner_key = :key',
                ExpressionAttributeValues={
                    ':key': {'S': summoner_key}
                },
                Limit=1
            )
            
            if response.get('Items') and len(response['Items']) > 0:
                puuid = response['Items'][0].get('puuid', {}).get('S')
                print(f"Found cached PUUID for {summoner_name}#{summoner_tagline} in {region}")
        except Exception as e:
            # Cache lookup failed, continue to API call
            print(f"Cache lookup failed (will fetch from API): {str(e)}")
        
        # If not in cache, fetch from Riot API
        if not puuid:
            try:
                puuid = client.get_puuid(summoner_name, summoner_tagline)
                print(f"Fetched PUUID from Riot API for {summoner_name}#{summoner_tagline}")
                
                # Cache the PUUID mapping in DynamoDB for future lookups
                try:
                    dynamodb_client.update_item(
                        TableName=table_name,
                        Key={'puuid': {'S': puuid}},
                        UpdateExpression='SET summoner_key = :key, summoner_name = :name, summoner_tagline = :tag, #region = :region, last_lookup = :time',
                        ExpressionAttributeNames={
                            '#region': 'region'  # 'region' is a reserved word in DynamoDB
                        },
                        ExpressionAttributeValues={
                            ':key': {'S': summoner_key},
                            ':name': {'S': summoner_name},
                            ':tag': {'S': summoner_tagline},
                            ':region': {'S': region},
                            ':time': {'S': datetime.now(timezone.utc).isoformat()}
                        }
                    )
                    print(f"Cached PUUID mapping for future lookups")
                except Exception as cache_error:
                    # Don't fail if caching fails
                    print(f"Failed to cache PUUID mapping: {str(cache_error)}")
                    
            except ValueError as e:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'Summoner not found'})
                }
            except Exception as e:
                # Sanitize error - never expose API key or internal details
                print(f"Error fetching PUUID: {str(e)}")
                return {
                    'statusCode': 500,
                    'body': json.dumps({'error': 'Failed to fetch account data. Please try again later.'})
                }
        
        # Check if user is already processed
        is_processed, aggregated_data = check_user_processed(puuid, bucket_name, table_name)
        
        if is_processed and aggregated_data:
            # Return cached aggregated data
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps(aggregated_data)
            }
        
        # User not processed, queue for processing
        success = queue_user_for_processing(puuid, summoner_name, summoner_tagline, region, queue_url)
        
        if not success:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Failed to queue user for processing'})
            }
        
        # Return processing status
        return {
            'statusCode': 202,  # Accepted
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'status': 'processing',
                'message': 'Your data is being processed. Please check back in a few moments.',
                'puuid': puuid
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Never expose internal errors that might contain sensitive data
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'An internal error occurred. Please try again later.'})
        }

