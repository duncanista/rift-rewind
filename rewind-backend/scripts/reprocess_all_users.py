#!/usr/bin/env python3
"""
Script to reprocess all users' match data.

This script scans DynamoDB for all users who have been processed,
and triggers the aggregate_user Lambda to reprocess their data from S3.

This is useful when you've updated the aggregation logic and want to
regenerate insights for all users without re-fetching from Riot API.

Usage:
    python reprocess_all_users.py --env dev
    python reprocess_all_users.py --env prod --dry-run
"""

import boto3
import json
import argparse
import time
from typing import List, Dict, Any


def scan_all_users(table_name: str) -> List[str]:
    """
    Scan DynamoDB table to get all PUUIDs.
    
    Args:
        table_name: Name of the user insights table
        
    Returns:
        List of PUUIDs
    """
    dynamodb = boto3.client('dynamodb', region_name='us-east-1')
    puuids = []
    
    print(f"Scanning DynamoDB table: {table_name}")
    
    # Scan with pagination
    scan_kwargs = {
        'TableName': table_name,
        'ProjectionExpression': 'puuid, summoner_name, summoner_tagline, #status',
        'ExpressionAttributeNames': {
            '#status': 'status'
        }
    }
    
    while True:
        response = dynamodb.scan(**scan_kwargs)
        
        for item in response.get('Items', []):
            puuid = item.get('puuid', {}).get('S')
            summoner_name = item.get('summoner_name', {}).get('S', 'Unknown')
            summoner_tagline = item.get('summoner_tagline', {}).get('S', 'Unknown')
            status = item.get('status', {}).get('S', 'unknown')
            
            if puuid:
                puuids.append({
                    'puuid': puuid,
                    'summoner': f"{summoner_name}#{summoner_tagline}",
                    'status': status
                })
        
        # Check if there are more items to scan
        if 'LastEvaluatedKey' not in response:
            break
            
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    print(f"Found {len(puuids)} users in DynamoDB")
    return puuids


def trigger_aggregation(lambda_name: str, puuid: str, dry_run: bool = False) -> bool:
    """
    Trigger the aggregate_user Lambda for a specific user.
    
    Args:
        lambda_name: Name of the aggregate_user Lambda function
        puuid: User's PUUID
        dry_run: If True, don't actually invoke the Lambda
        
    Returns:
        True if successful, False otherwise
    """
    if dry_run:
        print(f"  [DRY RUN] Would invoke {lambda_name} for PUUID: {puuid}")
        return True
    
    lambda_client = boto3.client('lambda', region_name='us-east-1')
    
    try:
        response = lambda_client.invoke(
            FunctionName=lambda_name,
            InvocationType='Event',  # Async invocation
            Payload=json.dumps({'puuid': puuid})
        )
        
        if response['StatusCode'] in [200, 202]:
            return True
        else:
            print(f"  ❌ Failed to invoke Lambda: Status {response['StatusCode']}")
            return False
            
    except Exception as e:
        print(f"  ❌ Error invoking Lambda: {str(e)}")
        return False


def reprocess_users(
    users: List[Dict[str, Any]], 
    lambda_name: str, 
    dry_run: bool = False,
    batch_delay: float = 0.1
) -> Dict[str, int]:
    """
    Reprocess all users by triggering the aggregate Lambda.
    
    Args:
        users: List of user dictionaries with puuid and summoner info
        lambda_name: Name of the aggregate_user Lambda function
        dry_run: If True, don't actually invoke Lambdas
        batch_delay: Delay between invocations in seconds
        
    Returns:
        Dictionary with success/failure counts
    """
    stats = {
        'total': len(users),
        'success': 0,
        'failed': 0,
        'skipped': 0
    }
    
    print(f"\n{'='*60}")
    print(f"Starting reprocessing of {stats['total']} users")
    print(f"Lambda: {lambda_name}")
    print(f"Dry run: {dry_run}")
    print(f"{'='*60}\n")
    
    for i, user in enumerate(users, 1):
        puuid = user['puuid']
        summoner = user['summoner']
        status = user.get('status', 'unknown')
        
        print(f"[{i}/{stats['total']}] Processing {summoner} (status: {status})")
        
        # Skip users that haven't been processed yet
        if status not in ['complete', 'processing']:
            print(f"  ⏭️  Skipping - status is '{status}'")
            stats['skipped'] += 1
            continue
        
        # Trigger aggregation
        success = trigger_aggregation(lambda_name, puuid, dry_run)
        
        if success:
            print(f"  ✅ Queued for reprocessing")
            stats['success'] += 1
        else:
            stats['failed'] += 1
        
        # Add delay to avoid overwhelming Lambda
        if not dry_run and i < stats['total']:
            time.sleep(batch_delay)
    
    return stats


def main():
    parser = argparse.ArgumentParser(
        description='Reprocess all users match data from S3'
    )
    parser.add_argument(
        '--env',
        choices=['dev', 'prod'],
        default='dev',
        help='Environment to run against (default: dev)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run without actually invoking Lambdas'
    )
    parser.add_argument(
        '--delay',
        type=float,
        default=0.1,
        help='Delay between Lambda invocations in seconds (default: 0.1)'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of users to process (for testing)'
    )
    
    args = parser.parse_args()
    
    # Construct resource names based on environment
    table_name = f"rift-rewind-user-insights-{args.env}"
    lambda_name = f"rift-rewind-aggregate-user-{args.env}"
    
    print(f"\n🔄 Rift Rewind - User Data Reprocessing Tool")
    print(f"Environment: {args.env}")
    print(f"Table: {table_name}")
    print(f"Lambda: {lambda_name}")
    
    if args.dry_run:
        print("⚠️  DRY RUN MODE - No actual changes will be made")
    
    print()
    
    # Scan DynamoDB for all users
    try:
        users = scan_all_users(table_name)
    except Exception as e:
        print(f"❌ Error scanning DynamoDB: {str(e)}")
        return 1
    
    if not users:
        print("No users found in DynamoDB")
        return 0
    
    # Apply limit if specified
    if args.limit:
        print(f"\n⚠️  Limiting to first {args.limit} users")
        users = users[:args.limit]
    
    # Confirm before proceeding
    if not args.dry_run:
        response = input(f"\n⚠️  About to reprocess {len(users)} users. Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted by user")
            return 0
    
    # Reprocess all users
    stats = reprocess_users(users, lambda_name, args.dry_run, args.delay)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"Reprocessing Complete!")
    print(f"{'='*60}")
    print(f"Total users:    {stats['total']}")
    print(f"✅ Queued:      {stats['success']}")
    print(f"❌ Failed:      {stats['failed']}")
    print(f"⏭️  Skipped:     {stats['skipped']}")
    print(f"{'='*60}\n")
    
    if not args.dry_run:
        print("💡 Tip: Check CloudWatch Logs to monitor aggregation progress")
        print(f"   Log group: /aws/lambda/{lambda_name}")
    
    return 0 if stats['failed'] == 0 else 1


if __name__ == '__main__':
    exit(main())
