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
    - Query parameters: ?summoner=name%23tagline
    - POST body: {"summoner": "name#tagline"}
    
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
        
        # Parse the event to get summoner name and tagline
        summoner_string = None
        
        # Lambda Function URL event structure
        # Check query string parameters first (GET requests)
        if 'queryStringParameters' in event and event['queryStringParameters']:
            summoner_string = event['queryStringParameters'].get('summoner')
        
        # Check body for POST requests
        elif 'body' in event and event['body']:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            summoner_string = body.get('summoner')
        
        # Fallback to direct event key (for testing)
        elif 'summoner' in event:
            summoner_string = event.get('summoner')
        
        if not summoner_string:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing summoner parameter. Expected format: "name#tagline"',
                    'usage': 'Query param: ?summoner=name%23tagline OR POST body: {"summoner": "name#tagline"}'
                })
            }
        
        # Parse summoner name and tagline from "name#tagline" format
        if '#' not in summoner_string:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid summoner format. Expected format: "name#tagline"'})
            }
        
        summoner_name, summoner_tagline = summoner_string.split('#', 1)
        
        # Initialize Riot API client
        client = RiotAPIClient(api_key)
        
        # Get PUUID for the summoner
        puuid = client.get_puuid(summoner_name, summoner_tagline)
        
        # Fetch last 10 ranked matches
        matches = client.get_matches(puuid, count=10)
        
        # Fetch detailed data for each match
        match_data_list = []
        for match in matches:
            match_data = client.get_match(match)
            match_data_list.append(match_data)
        
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
            'summoner': 'duncanista#LAN'
        }
    }
    
    # Test with Lambda Function URL event format (POST with body)
    test_event_post = {
        'body': json.dumps({'summoner': 'duncanista#LAN'})
    }
    
    print("Testing with GET query parameters:")
    print("Note: This requires AWS credentials and a valid Secrets Manager ARN")
    result = lambda_handler(test_event_get, None)
    print(f"Status: {result['statusCode']}")
    if result['statusCode'] == 200:
        print(json.dumps(json.loads(result['body']), indent=2))
    else:
        print(result['body'])

