'''
AWS Lambda handler for aggregating match data.
This lambda will receive an event with summoner name and tagline,
fetch match data from Riot API, aggregate it, and return the result.
'''

import json
import os
import sys
from pathlib import Path
from typing import Dict, Any
import boto3
from botocore.exceptions import ClientError

sys.path.insert(0, str(Path(__file__).parent.parent))

from common.fetch_api import RiotAPIClient
from aggregator.aggregator import MatchDataAggregator

# Cache for API key to avoid multiple Secrets Manager calls
_api_key_cache = None


def get_api_key_from_secrets_manager(secret_arn: str) -> str:
    """
    Retrieve API key from AWS Secrets Manager.
    
    Args:
        secret_arn: The ARN of the secret in Secrets Manager
        
    Returns:
        The API key string
        
    Raises:
        ClientError: If unable to retrieve the secret
    """
    global _api_key_cache
    
    # Return cached value if available
    if _api_key_cache:
        return _api_key_cache
    
    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager')
    
    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_arn)
    except ClientError as e:
        raise Exception(f"Failed to retrieve secret: {str(e)}")
    
    # Parse the secret value
    if 'SecretString' in get_secret_value_response:
        secret = get_secret_value_response['SecretString']
        # If it's a JSON string with a key, parse it
        try:
            secret_dict = json.loads(secret)
            # Assume the key is stored with key "api_key" or "RIOT_API_KEY"
            api_key = secret_dict.get('api_key') or secret_dict.get('RIOT_API_KEY')
            if not api_key:
                # If no specific key, try to use the first value
                api_key = list(secret_dict.values())[0] if secret_dict else None
        except json.JSONDecodeError:
            # If it's not JSON, use the raw string
            api_key = secret
    else:
        raise Exception("Secret does not contain a string value")
    
    if not api_key:
        raise Exception("API key not found in secret")
    
    # Cache the API key for subsequent invocations
    _api_key_cache = api_key
    return api_key


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for aggregating match data via Lambda Function URL.
    
    Expected Lambda Function URL event format:
    - Query parameters: ?summoner=name%23tagline&region=kr
    - POST body: {"summoner": "name#tagline", "region": "kr"}
    
    Returns aggregated match data as JSON.
    """
    try:
        # Get API key from Secrets Manager using ARN from environment variable
        secret_arn = os.environ.get('RIOT_API_KEY_SECRET_ARN')
        if not secret_arn:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'RIOT_API_KEY_SECRET_ARN environment variable not configured'})
            }
        
        try:
            api_key = get_api_key_from_secrets_manager(secret_arn)
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Failed to retrieve API key from Secrets Manager: {str(e)}'})
            }
        
        # Parse the event to get summoner name, tagline, and region
        summoner_string = None
        region = None
        
        # Lambda Function URL event structure
        # Check query string parameters first (GET requests)
        if 'queryStringParameters' in event and event['queryStringParameters']:
            summoner_string = event['queryStringParameters'].get('summoner')
            region = event['queryStringParameters'].get('region')
        
        # Check body for POST requests
        elif 'body' in event and event['body']:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            summoner_string = body.get('summoner')
            region = body.get('region')
        
        # Fallback to direct event key (for testing)
        elif 'summoner' in event:
            summoner_string = event.get('summoner')
            region = event.get('region')
        
        if not summoner_string:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing summoner parameter. Expected format: "name#tagline"',
                    'usage': 'Query param: ?summoner=name%23tagline&region=kr OR POST body: {"summoner": "name#tagline", "region": "kr"}'
                })
            }
        
        # Parse summoner name and tagline from "name#tagline" format
        if '#' not in summoner_string:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid summoner format. Expected format: "name#tagline"'})
            }
        
        summoner_name, summoner_tagline = summoner_string.split('#', 1)
        
        # Default to 'americas' if no region specified
        if not region:
            region = 'americas'
            print(f"No region specified, defaulting to 'americas'")
        
        print(f"Processing request for summoner: {summoner_name}#{summoner_tagline}, region: {region}")
        
        # Initialize Riot API client with region
        client = RiotAPIClient(api_key, region=region)
        
        # Get PUUID for the summoner
        try:
            puuid = client.get_puuid(summoner_name, summoner_tagline)
        except ValueError as e:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': str(e)})
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Failed to fetch account data: {str(e)}'})
            }
        
        # Fetch last 10 ranked matches
        try:
            matches = client.get_matches(puuid, count=10)
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Failed to fetch match list: {str(e)}'})
            }
        
        # Check if player has any ranked matches
        if not matches:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'message': f'No ranked matches found for {summoner_name}#{summoner_tagline}',
                    'summoner': f'{summoner_name}#{summoner_tagline}',
                    'region': region,
                    'matches_found': 0
                })
            }
        
        # Fetch detailed data for each match
        match_data_list = []
        for match in matches:
            try:
                match_data = client.get_match(match)
                match_data_list.append(match_data)
            except Exception as e:
                print(f"Warning: Failed to fetch match {match}: {str(e)}")
                # Continue with other matches even if one fails
                continue
        
        # Check if we got any valid match data
        if not match_data_list:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Failed to fetch any match details'})
            }
        
        # Aggregate the match data
        aggregator = MatchDataAggregator(puuid, match_data_list)
        
        # Return the aggregated data
        # Note: CORS headers are handled by Lambda Function URL configuration
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps(aggregator.aggregated_data)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


# For local testing
if __name__ == "__main__":
    # Set environment variable for testing
    # In production, this should be the actual Secrets Manager ARN
    # For local testing, you can either:
    # 1. Set a real ARN if you have AWS credentials configured
    # 2. Mock the Secrets Manager call
    os.environ['RIOT_API_KEY_SECRET_ARN'] = "arn:aws:secretsmanager:us-east-1:123456789012:secret:riot-api-key"
    
    # Test with Lambda Function URL event format (GET with query params)
    test_event_get = {
        'queryStringParameters': {
            'summoner': 'duncanista#LAN',
            'region': 'la1'
        }
    }
    
    # Test with Lambda Function URL event format (POST with body) - KR region
    test_event_post_kr = {
        'body': json.dumps({'summoner': 'Hide on bush#KR1', 'region': 'kr'})
    }
    
    print("Testing with GET query parameters (LAN region):")
    print("Note: This requires AWS credentials and a valid Secrets Manager ARN")
    result = lambda_handler(test_event_get, None)
    print(f"Status: {result['statusCode']}")
    if result['statusCode'] == 200:
        print(json.dumps(json.loads(result['body']), indent=2))
    else:
        print(result['body'])
    
    print("\n" + "="*80 + "\n")
    print("Testing with POST body (KR region):")
    result_kr = lambda_handler(test_event_post_kr, None)
    print(f"Status: {result_kr['statusCode']}")
    if result_kr['statusCode'] == 200:
        print(json.dumps(json.loads(result_kr['body']), indent=2))
    else:
        print(result_kr['body'])

