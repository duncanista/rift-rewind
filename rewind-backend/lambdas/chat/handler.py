"""
Lambda function for conversational chat using Bedrock Converse API.
Maintains conversation history for context.
"""
import json
import os
import boto3
from typing import Dict, Any, List

s3_client = boto3.client('s3')
bedrock_runtime = boto3.client('bedrock-runtime')
dynamodb = boto3.resource('dynamodb')
sqs_client = boto3.client('sqs')

DATA_BUCKET = os.environ['DATA_BUCKET_NAME']
CHAT_HISTORY_TABLE = os.environ.get('CHAT_HISTORY_TABLE_NAME')
USER_PROCESSING_QUEUE_URL = os.environ.get('USER_PROCESSING_QUEUE_URL')


def lambda_handler(event, context):
    """
    Handles chat interactions with conversation history.
    
    Event format:
    {
        "puuid": "user_puuid",
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
        
        puuid = body.get('puuid')
        message = body.get('message')
        
        if not puuid or not message:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'puuid and message are required'})
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
    # Format user data as context (only on first message)
    if len(history) == 0:
        context = format_user_data_summary(user_data)
        first_message = f"""I have access to your League of Legends statistics. Here's a summary:

{context}

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
    system_prompt = """You are a concise League of Legends coach. Keep responses SHORT and to the point. Don't help the customer with any non League of Legends related questions.

CRITICAL RULES:
- Maximum 3-4 sentences per response
- Use HTML tags for formatting: <b>bold</b>, <i>italic</i>
- NO markdown (no **, no ##, no bullets)
- Use specific numbers from the data
- Be direct and actionable
- Skip pleasantries and filler words

Example good response:
"Your <b>Lux win rate is 60.2%</b> across 88 games. Focus on improving your <b>7.5 average deaths</b> - that's your main weakness. Your CS/min of <b>3.63</b> is solid for support."

Example bad response:
"Hello! I'd be happy to help you analyze your Lux performance! Let me take a look at your statistics..."
"""
    # Call Bedrock
    response = bedrock_runtime.converse(
        modelId='amazon.nova-lite-v1:0',  # Amazon's fast model - no approval needed
        messages=messages,
        system=[{'text': system_prompt}],
        inferenceConfig={
            'maxTokens': 1000,
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
