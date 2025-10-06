'''
This lambda will fetch the puuid data from the DB,
and if it's missing, will make an api call to get all their match IDs.
It will then send those IDs to a SQS queue for another lambda to process.
'''


from common.fetch_api import RiotAPIClient
import json
import boto3
import os


#Initialize AWS clients
SQS_CLIENT = boto3.client('sqs')
SFN_CLIENT = boto3.client('stepfunctions')
STEP_FUNCTION_ARN = os.environ['STEP_FUNCTION_ARN']
DEV_API_KEY = os.environ['DEV_API_KEY']


def handler(event, context):
    """
    Creates a temporary SQS queue, sends a batch of messages with match IDs to it. 
    Then starts a Step Function state machine to process the messages.
    """
    summoner_name = event['summoner_name']
    summoner_tagline = event['summoner_tagline']

    client = RiotAPIClient(DEV_API_KEY)
    puuid = client.get_puuid(summoner_name, summoner_tagline)

    matches = client.get_matches(puuid)

    # Create a temporary SQS queue
    queue_name = f"matches-{puuid}"
    response = SQS_CLIENT.create_queue(
        QueueName=queue_name
    )
    queue_url = response['QueueUrl']

    # Send messages to the queue
    # TODO: batch matches inot sets of 10 anduse send_message_batch
    for match in matches:
        SQS_CLIENT.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(match)
        )

    # Start the Step Function state machine
    SFN_CLIENT.start_execution(
        StateMachineArn=STEP_FUNCTION_ARN,
        Input=json.dumps({
            "queue_url": queue_url
        })
    )

    return {
        'statusCode': 200,
        'body': 'Matches fetched and sent to SQS queue'
    }
