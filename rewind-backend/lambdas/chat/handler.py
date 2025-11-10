"""
Lambda function for conversational chat using Bedrock Converse API.
Maintains conversation history for context.
"""
import json
import os
import boto3
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

from lib.riot_api import RiotAPIClient
from lib.aws_utils import get_secret_from_secrets_manager

s3_client = boto3.client('s3')
bedrock_runtime = boto3.client('bedrock-runtime')
dynamodb = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')
sqs_client = boto3.client('sqs')

DATA_BUCKET = os.environ['DATA_BUCKET_NAME']
CHAT_HISTORY_TABLE = os.environ.get('CHAT_HISTORY_TABLE_NAME')
USER_PROCESSING_QUEUE_URL = os.environ.get('USER_PROCESSING_QUEUE_URL')
RIOT_API_KEY_SECRET_ARN = os.environ.get('RIOT_API_KEY_SECRET_ARN')
USER_INSIGHTS_TABLE = os.environ.get('USER_INSIGHTS_TABLE_NAME')


def get_puuid_from_summoner(summoner_name: str, summoner_tagline: str, region: str, api_key: str) -> Optional[str]:
    """
    Get PUUID from summoner name and tagline, checking cache first.
    Returns PUUID or None if not found.
    """
    if not USER_INSIGHTS_TABLE:
        # No cache table, fetch directly from API
        client = RiotAPIClient(api_key, region=region)
        try:
            puuid = client.get_puuid(summoner_name, summoner_tagline)
            return puuid
        except Exception as e:
            print(f"Error fetching PUUID: {str(e)}")
            return None
    
    # Create cache key
    summoner_key = f"{summoner_name}#{summoner_tagline}#{region}".lower()
    
    # Try cache first
    try:
        response = dynamodb_client.query(
            TableName=USER_INSIGHTS_TABLE,
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
            return puuid
    except Exception as e:
        print(f"Cache lookup failed (will fetch from API): {str(e)}")
    
    # Not in cache, fetch from Riot API
    client = RiotAPIClient(api_key, region=region)
    try:
        puuid = client.get_puuid(summoner_name, summoner_tagline)
        print(f"Fetched PUUID from Riot API for {summoner_name}#{summoner_tagline}")
        
        # Cache the PUUID mapping
        if USER_INSIGHTS_TABLE:
            try:
                dynamodb_client.update_item(
                    TableName=USER_INSIGHTS_TABLE,
                    Key={'puuid': {'S': puuid}},
                    UpdateExpression='SET summoner_key = :key, summoner_name = :name, summoner_tagline = :tag, #region = :region, last_lookup = :time',
                    ExpressionAttributeNames={
                        '#region': 'region'
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
                print(f"Failed to cache PUUID mapping: {str(cache_error)}")
        
        return puuid
    except Exception as e:
        print(f"Error fetching PUUID: {str(e)}")
        return None


def lambda_handler(event, context):
    """
    Handles chat interactions with conversation history.
    
    Event format:
    {
        "summoner": "Hide on bush#KR1",
        "region": "kr",
        "message": "What's my win rate with Lux?",
        "session_id": "optional_session_id",
        "clear_history": false  # Optional: clear conversation history
    }
    """
    try:
        # Parse input
        body = event.get('body', event)
        if isinstance(body, str):
            body = json.loads(body)
        
        summoner_string = body.get('summoner')
        region = body.get('region', 'americas')
        message = body.get('message')
        
        if not summoner_string or not message:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'summoner and message are required'})
            }
        
        # Parse summoner name and tagline
        if '#' not in summoner_string:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'Invalid summoner format. Expected format: "name#tagline"'})
            }
        
        summoner_name, summoner_tagline = summoner_string.split('#', 1)
        
        # Get API key
        if not RIOT_API_KEY_SECRET_ARN:
            return {
                'statusCode': 500,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'API key not configured'})
            }
        
        try:
            api_key = get_secret_from_secrets_manager(RIOT_API_KEY_SECRET_ARN)
        except Exception as e:
            print(f"Error getting API key: {str(e)}")
            return {
                'statusCode': 500,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'Failed to retrieve API key'})
            }
        
        # Get PUUID from summoner name and tagline
        puuid = get_puuid_from_summoner(summoner_name, summoner_tagline, region, api_key)
        if not puuid:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'Summoner not found',
                    'message': 'Could not find summoner with the provided name and tagline'
                })
            }
        
        session_id = body.get('session_id', puuid)  # Use puuid as default session
        clear_history = body.get('clear_history', False)
        
        # Get user's aggregated data
        try:
            aggregated_key = f'aggregated/{puuid}/aggregated_data.json'
            response = s3_client.get_object(Bucket=DATA_BUCKET, Key=aggregated_key)
            user_data = json.loads(response['Body'].read().decode('utf-8'))
        except s3_client.exceptions.NoSuchKey:
            # Try alternate location (legacy)
            try:
                legacy_key = f'users/{puuid}/aggregated.json'
                response = s3_client.get_object(Bucket=DATA_BUCKET, Key=legacy_key)
                user_data = json.loads(response['Body'].read().decode('utf-8'))
                print(f"Found data at legacy location: {legacy_key}")
            except s3_client.exceptions.NoSuchKey:
                # No data found - queue the user for processing only if we have the queue URL
                if USER_PROCESSING_QUEUE_URL:
                    try:
                        sqs_client.send_message(
                            QueueUrl=USER_PROCESSING_QUEUE_URL,
                            MessageBody=json.dumps({'puuid': puuid})
                        )
                        print(f"Queued user {puuid} for processing")
                    except Exception as e:
                        print(f"Error queuing user: {str(e)}")
                
                return {
                    'statusCode': 404,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'error': 'No data found for this user',
                        'message': 'Please ensure matches have been processed first. You can process your matches at /chronobreak',
                        'puuid': puuid
                    })
                }
        
        # Get conversation history
        if clear_history:
            conversation_history = []
        else:
            conversation_history = get_conversation_history(session_id)
        
        # Generate response
        response_text, updated_history = chat_with_bedrock(
            user_data, 
            message, 
            conversation_history
        )
        
        # Save conversation history
        save_conversation_history(session_id, updated_history)
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'puuid': puuid,
                'summoner': summoner_string,
                'region': region,
                'message': message,
                'response': response_text,
                'session_id': session_id,
                'conversation_length': len(updated_history)
            })
        }
        
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


def chat_with_bedrock(user_data: Dict[str, Any], message: str, history: List[Dict]) -> tuple:
    """
    Generates a chat response using Bedrock with conversation history.
    Returns (response_text, updated_history)
    """
    # Format ALL user data as context (only on first message)
    if len(history) == 0:
        # Convert entire user_data to JSON string for full context
        context = json.dumps(user_data, indent=2)
        first_message = f"""I have access to your complete League of Legends statistics data. Here's ALL your data in JSON format:

{context}

This includes:
- Overall performance metrics
- Detailed champion statistics
- Position preferences
- Individual match performance
- Best matches
- Time-based trends

Now, you asked: {message}"""
    else:
        first_message = message
    
    # Build conversation messages
    messages = history.copy()
    messages.append({
        'role': 'user',
        'content': [{'text': first_message if len(history) == 0 else message}]
    })
    
    # System prompt
    system_prompt = """You are an expert League of Legends coach with deep game knowledge. Keep responses SHORT and to the point. Don't help the customer with any non League of Legends related questions.

You have access to the player's complete match data in JSON format, including:
- Overall stats (KDA, win rate, CS, vision score)
- Champion-specific performance (wins, losses, KDA per champion)
- Position preferences and performance
- Individual match data
- Performance trends

CRITICAL RULES:
- Maximum 3-4 sentences per response
- Use HTML tags for formatting: <b>bold</b>, <i>italic</i>
- NO markdown (no **, no ##, no bullets)
- Use specific numbers from the data
- Provide actionable League of Legends advice
- Reference specific champions, items, or strategies when relevant
- Skip pleasantries and filler words

Example good response:
"Your <b>Lux win rate is 60.2%</b> across 88 games. Focus on improving your <b>7.5 average deaths</b> - work on positioning before going for combos. Your CS/min of <b>3.63</b> is solid for support."

Example bad response:
"Hello! I'd be happy to help you analyze your Lux performance! Let me take a look at your statistics..."
"""
    # Call Bedrock with Claude 3.7 Sonnet
    response = bedrock_runtime.converse(
        modelId='us.meta.llama3-1-70b-instruct-v1:0',  # Claude 3.7 Sonnet
        messages=messages,
        system=[{'text': system_prompt}],
        inferenceConfig={
            'maxTokens': 2000,
            'temperature': 0.7,
        }
    )
    
    # Extract response
    response_text = response['output']['message']['content'][0]['text']
    
    # Update history
    messages.append({
        'role': 'assistant',
        'content': [{'text': response_text}]
    })
    
    # Keep only last 10 messages (5 exchanges) to avoid token limits
    if len(messages) > 10:
        messages = messages[-10:]
    
    return response_text, messages


def format_user_data_summary(data: Dict[str, Any]) -> str:
    """
    Creates a concise summary of user data for context.
    """
    lines = []
    
    # Basic stats
    win_rate = (data.get('won', 0) / max(data.get('match_count', 1), 1)) * 100
    kda_ratio = (data.get('kills', 0) + data.get('assists', 0)) / max(data.get('deaths', 1), 1)
    
    lines.append(f"Total Matches: {data.get('match_count', 0)}")
    lines.append(f"Win Rate: {win_rate:.1f}% ({data.get('won', 0)}W / {data.get('lost', 0)}L)")
    lines.append(f"Overall KDA: {data.get('kills', 0)}/{data.get('deaths', 0)}/{data.get('assists', 0)} ({kda_ratio:.2f} ratio)")
    
    # Top 3 champions
    if 'champion_stats' in data:
        champ_stats = data['champion_stats']
        top_champs = sorted(champ_stats.items(), key=lambda x: x[1].get('games', 0), reverse=True)[:3]
        champ_list = ', '.join([f"{c[0]} ({c[1].get('games')} games)" for c in top_champs])
        lines.append(f"\nTop Champions: {champ_list}")
    
    # Favorite position
    if 'positions' in data:
        positions = data['positions']
        fav_pos = max(positions.items(), key=lambda x: x[1])
        lines.append(f"Main Position: {fav_pos[0]} ({fav_pos[1]} games)")
    
    return "\n".join(lines)


def get_conversation_history(session_id: str) -> List[Dict]:
    """
    Retrieves conversation history from DynamoDB (if table exists).
    """
    if not CHAT_HISTORY_TABLE:
        return []
    
    try:
        table = dynamodb.Table(CHAT_HISTORY_TABLE)
        response = table.get_item(Key={'session_id': session_id})
        
        if 'Item' in response:
            return json.loads(response['Item'].get('history', '[]'))
    except Exception as e:
        print(f"Error getting history: {str(e)}")
    
    return []


def save_conversation_history(session_id: str, history: List[Dict]):
    """
    Saves conversation history to DynamoDB (if table exists).
    """
    if not CHAT_HISTORY_TABLE:
        return
    
    try:
        table = dynamodb.Table(CHAT_HISTORY_TABLE)
        table.put_item(Item={
            'session_id': session_id,
            'history': json.dumps(history),
            'ttl': int(boto3.client('sts').get_caller_identity()['Account']) + 86400  # 24 hour TTL
        })
    except Exception as e:
        print(f"Error saving history: {str(e)}")


def get_cors_headers() -> Dict[str, str]:
    """
    Returns headers for the response.
    Note: CORS is handled by Lambda Function URL, so we don't add CORS headers here.
    """
    return {
        'Content-Type': 'application/json'
    }
