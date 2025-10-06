'''
This lambda will fetch the puuid data from the DB,
and if it's missing, will make an api call to get all their match IDs.
It will then send those IDs to a SQS queue for another lambda to process.
'''

