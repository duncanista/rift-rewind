"""
Lambda function to generate insights using Bedrock Converse API directly.
This is a simpler approach that doesn't require Knowledge Base or OpenSearch.
"""
import json
import os
import boto3
from typing import Dict, Any

s3_client = boto3.client('s3')
bedrock_runtime = boto3.client('bedrock-runtime')
sqs_client = boto3.client('sqs')

DATA_BUCKET = os.environ['DATA_BUCKET_NAME']
USER_PROCESSING_QUEUE_URL = os.environ.get('USER_PROCESSING_QUEUE_URL')


def lambda_handler(event, context):
    """
    Generates insights for a player using Bedrock Converse API.
    
    Event format:
    {
        "puuid": "user_puuid",
        "query": "What are my best champions?",  # Optional custom query
    }
    """
    try:
        # Parse input
        body = event.get('body', event)
        if isinstance(body, str):
            body = json.loads(body)
        
        puuid = body.get('puuid')
        if not puuid:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'puuid is required'})
            }
        
        # Get user's aggregated data from S3
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
                        'message': 'Please ensure matches have been processed first',
                        'puuid': puuid
                    })
                }
        
        # Get query or use default
        user_query = body.get('query', 'Provide a comprehensive analysis of my League of Legends performance')
        
        # Generate insights using Bedrock
        insights = generate_insights_with_bedrock(user_data, user_query)
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'puuid': puuid,
                'query': user_query,
                'insights': insights,
                'data_last_updated': user_data.get('last_updated')
            })
        }
        
    except Exception as e:
        print(f"Error generating insights: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


def generate_insights_with_bedrock(user_data: Dict[str, Any], query: str) -> str:
    """
    Generates insights using Bedrock Converse API with user data as context.
    """
    # Format user data into a readable context
    context = format_user_data_for_context(user_data)
    
    # Create the prompt
    system_prompt = """You are a concise League of Legends analyst. Keep insights SHORT and impactful.

CRITICAL RULES:
- Maximum 5-6 sentences total
- Use HTML tags for formatting: <b>bold</b>, <i>italic</i>
- NO markdown (no **, no ##, no bullets)
- Lead with the most important insight
- Use specific numbers from the data
- Be direct and actionable
- Skip introductions and conclusions

Example format:
"Your <b>60.2% win rate</b> on Lux is excellent. Main issue: <b>7.5 deaths per game</b> - work on positioning. Your <b>3.63 CS/min</b> is solid for support. Focus on reducing deaths and you'll climb easily."

    user_message = f"""Here is the player's League of Legends statistics:

{context}

Player's question: {query}

Please provide a detailed, insightful analysis based on this data."""

    # Call Bedrock Converse API
    response = bedrock_runtime.converse(
        modelId='amazon.nova-lite-v1:0',  # Amazon's fast model - no approval needed
        messages=[
            {
                'role': 'user',
                'content': [{'text': user_message}]
            }
        ],
        system=[{'text': system_prompt}],
        inferenceConfig={
            'maxTokens': 2000,
            'temperature': 0.7,
            'topP': 0.9,
        }
    )
    
    # Extract the response text
    return response['output']['message']['content'][0]['text']


def format_user_data_for_context(data: Dict[str, Any]) -> str:
    """
    Formats user data into a readable context for the LLM.
    """
    lines = []
    
    # Overall stats
    lines.append("=== OVERALL PERFORMANCE ===")
    lines.append(f"Total Matches: {data.get('match_count', 0)}")
    lines.append(f"Wins: {data.get('won', 0)} | Losses: {data.get('lost', 0)}")
    win_rate = (data.get('won', 0) / max(data.get('match_count', 1), 1)) * 100
    lines.append(f"Win Rate: {win_rate:.1f}%")
    lines.append(f"KDA: {data.get('kills', 0)}/{data.get('deaths', 0)}/{data.get('assists', 0)}")
    kda_ratio = (data.get('kills', 0) + data.get('assists', 0)) / max(data.get('deaths', 1), 1)
    lines.append(f"KDA Ratio: {kda_ratio:.2f}")
    lines.append(f"Total CS: {data.get('cs', 0)}")
    lines.append(f"Total Vision Score: {data.get('vision_score', 0)}")
    lines.append("")
    
    # Performance metrics
    if 'performance_metrics' in data:
        metrics = data['performance_metrics']
        lines.append("=== AVERAGE PER GAME ===")
        lines.append(f"Kills: {metrics.get('avg_kills', 0):.1f}")
        lines.append(f"Deaths: {metrics.get('avg_deaths', 0):.1f}")
        lines.append(f"Assists: {metrics.get('avg_assists', 0):.1f}")
        lines.append(f"CS: {metrics.get('avg_cs', 0):.1f} ({metrics.get('cs_per_minute', 0):.2f} per min)")
        lines.append(f"Vision Score: {metrics.get('avg_vision_score', 0):.1f} ({metrics.get('vision_per_minute', 0):.2f} per min)")
        lines.append(f"Game Duration: {metrics.get('avg_game_duration', 0):.1f} minutes")
        lines.append("")
    
    # Position preferences
    if 'positions' in data:
        lines.append("=== POSITION PREFERENCES ===")
        positions = data['positions']
        total = sum(positions.values())
        for pos, count in sorted(positions.items(), key=lambda x: x[1], reverse=True):
            pct = (count / total * 100) if total > 0 else 0
            lines.append(f"{pos}: {count} games ({pct:.1f}%)")
        lines.append("")
    
    # Top champions
    if 'champion_stats' in data:
        lines.append("=== TOP CHAMPIONS (by games played) ===")
        champ_stats = data['champion_stats']
        sorted_champs = sorted(champ_stats.items(), key=lambda x: x[1].get('games', 0), reverse=True)
        
        for champ, stats in sorted_champs[:10]:
            lines.append(f"\n{champ}:")
            lines.append(f"  Games: {stats.get('games', 0)} | Win Rate: {stats.get('win_rate', 0):.1f}%")
            lines.append(f"  KDA: {stats.get('avg_kills', 0):.1f}/{stats.get('avg_deaths', 0):.1f}/{stats.get('avg_assists', 0):.1f}")
            champ_kda = (stats.get('avg_kills', 0) + stats.get('avg_assists', 0)) / max(stats.get('avg_deaths', 1), 1)
            lines.append(f"  KDA Ratio: {champ_kda:.2f}")
            lines.append(f"  CS/min: {stats.get('cs_per_minute', 0):.2f}")
        lines.append("")
    
    # Best match
    if 'best_match' in data:
        best = data['best_match']
        lines.append("=== BEST MATCH ===")
        lines.append(f"Champion: {best.get('champion', 'N/A')}")
        lines.append(f"KDA: {best.get('kda', 'N/A')} (Ratio: {best.get('kda_ratio', 0):.2f})")
        lines.append(f"CS: {best.get('cs', 0)} | Vision: {best.get('vision_score', 0)}")
        lines.append("")
    
    return "\n".join(lines)


def get_cors_headers() -> Dict[str, str]:
    """
    Returns headers for the response.
    Note: CORS is handled by Lambda Function URL, so we don't add CORS headers here.
    """
    return {
        'Content-Type': 'application/json'
    }
