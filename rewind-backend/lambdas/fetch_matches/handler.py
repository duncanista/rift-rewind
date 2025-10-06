"""
This lambda will fetch the puuid data from the DB,
and if it's missing, will make an api call to get all their match IDs.
It will then send those IDs to a SQS queue for another lambda to process.
"""

from common.fetch_api import RiotAPIClient
import json
import boto3
import os
from typing import Dict, Any, List


# Initialize AWS clients
SQS_CLIENT = boto3.client("sqs")
SFN_CLIENT = boto3.client("stepfunctions")
STEP_FUNCTION_ARN = os.environ["STEP_FUNCTION_ARN"]
DEV_API_KEY = os.environ["DEV_API_KEY"]


def create_queue(puuid: str) -> str:
    queue_name = f"matches-{puuid}"
    response = SQS_CLIENT.create_queue(QueueName=queue_name)
    return response["QueueUrl"]


def send_messages_to_queue(queue_url: str, matches: List[str]) -> None:
    for match in matches:
        SQS_CLIENT.send_message(QueueUrl=queue_url, MessageBody=json.dumps(match))


def start_step_function_execution(
    puuid: str, queue_url: str, queue_arn: str, batch_size: int
) -> None:

    SFN_CLIENT.start_execution(
        StateMachineArn=STEP_FUNCTION_ARN,
        Name=f"batch-execution-{puuid}",
        Input=json.dumps(
            {
                "queue_url": queue_url,
                "queue_arn": queue_arn,
                "expected_matches": batch_size,
            }
        ),
    )


def delete_queue(queue_url: str) -> None:
    SQS_CLIENT.delete_queue(QueueUrl=queue_url)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Creates a temporary SQS queue, sends a batch of messages with match IDs to it.
    Then starts a Step Function state machine to process the messages.
    """
    summoner_name = event["summoner_name"]
    summoner_tagline = event["summoner_tagline"]

    client = RiotAPIClient(DEV_API_KEY)
    puuid = client.get_puuid(summoner_name, summoner_tagline)

    matches = client.get_matches(puuid)
    batch_size = len(matches)

    # Create a temporary SQS queue
    try:
        queue_url = create_queue(puuid)
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"Failed to create SQS queue: {str(e)}"}),
        }

    # Send messages to the queue
    try:
        send_messages_to_queue(queue_url, matches)
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps(
                {"error": f"Failed to send messages to SQS queue: {str(e)}"}
            ),
        }

    queue_arn = SQS_CLIENT.get_queue_attributes(
        QueueUrl=queue_url, AttributeNames=["QueueArn"]
    )["QueueArn"]

    # Start the Step Function execution
    try:
        start_step_function_execution(puuid, queue_url, queue_arn, batch_size)
    except Exception as e:
        # Delete the queue if the Step Function execution fails
        delete_queue(queue_url)
        return {
            "statusCode": 500,
            "body": json.dumps(
                {"error": f"Failed to start Step Function execution: {str(e)}"}
            ),
        }

    return {"statusCode": 200, "body": "Matches fetched and sent to SQS queue"}
