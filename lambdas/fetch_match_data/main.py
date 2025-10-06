'''
This lambda will trigger after fetch_matches lambda.
It will run once per match ID and send the match data to a SQS queue for another lambda to process.
'''

import boto3
import json
from typing import List, Dict, Any

# def main() -> None:
    # sqs = boto3.client("sqs")
    # queue_url = "https://sqs.us-east-1.amazonaws.com/123456789012/match-data-queue"
    # messages = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=10)
    # for message in messages["Messages"]:
    #     match_id = message["Body"]
    #     match_data = get_match_data(match_id)