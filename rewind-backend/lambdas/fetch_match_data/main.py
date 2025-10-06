'''
This lambda will be triggered by a Step Function. 
It receives a single match ID and returns the match data.
'''

import json
from typing import Dict, Any
from common.fetch_api import RiotAPIClient, MatchAnalyzer
import os

DEV_API_KEY = os.environ["DEV_API_KEY"]

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    if len(event['Records']) != 1:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Expected 1 record, got ' + str(len(event['Records']))})
        }

    try:
        message = json.loads(event['Records'][0]['body'])
        match_id = message['match_id']
        puuid = message['puuid']

    except Exception as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Record not formatted correctly: ' + str(e)})
        }

    client = RiotAPIClient(DEV_API_KEY)
    try:
        match_data = client.get_match(match_id)
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Failed to get match data: ' + str(e)})
        }

    match_analyzer = MatchAnalyzer(puuid, match_data)
    match_data = match_analyzer.get_match_data()


    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Match data processed', 'match_data': match_data})
    }