# Rewind Backend Scripts

Utility scripts for managing and maintaining the Rift Rewind backend.

## Prerequisites

```bash
# Install AWS CLI and configure credentials
aws configure

# Install Python dependencies
pip install boto3
```

## Scripts

### `reprocess_all_users.py`

Reprocesses all users' match data to regenerate insights with updated aggregation logic.

**Use Case**: When you've added new stats or updated the aggregation algorithm and want to regenerate insights for all existing users without re-fetching from Riot API.

**How it works**:
1. Scans DynamoDB to find all processed users
2. Triggers the `aggregate_user` Lambda for each user
3. Lambda reads existing match data from S3 and regenerates aggregated insights

#### Usage

```bash
# Dry run (see what would happen without making changes)
python scripts/reprocess_all_users.py --env dev --dry-run

# Reprocess all users in dev environment
python scripts/reprocess_all_users.py --env dev

# Reprocess with custom delay between invocations
python scripts/reprocess_all_users.py --env dev --delay 0.5

# Test with limited number of users
python scripts/reprocess_all_users.py --env dev --limit 10

# Production reprocessing
python scripts/reprocess_all_users.py --env prod
```

#### Options

- `--env`: Environment to run against (`dev` or `prod`, default: `dev`)
- `--dry-run`: Preview what would happen without actually invoking Lambdas
- `--delay`: Delay between Lambda invocations in seconds (default: 0.1)
- `--limit`: Limit number of users to process (useful for testing)

#### Example Output

```
🔄 Rift Rewind - User Data Reprocessing Tool
Environment: dev
Table: rift-rewind-user-insights-dev
Lambda: rift-rewind-aggregate-user-dev

Scanning DynamoDB table: rift-rewind-user-insights-dev
Found 150 users in DynamoDB

============================================================
Starting reprocessing of 150 users
Lambda: rift-rewind-aggregate-user-dev
Dry run: False
============================================================

[1/150] Processing PlayerName#TAG (status: complete)
  ✅ Queued for reprocessing
[2/150] Processing AnotherPlayer#NA1 (status: complete)
  ✅ Queued for reprocessing
...

============================================================
Reprocessing Complete!
============================================================
Total users:    150
✅ Queued:      145
❌ Failed:      0
⏭️  Skipped:     5
============================================================

💡 Tip: Check CloudWatch Logs to monitor aggregation progress
   Log group: /aws/lambda/rift-rewind-aggregate-user-dev
```

## Safety Features

- **Dry run mode**: Test without making changes
- **Confirmation prompt**: Asks for confirmation before reprocessing in non-dry-run mode
- **Status filtering**: Only reprocesses users with 'complete' or 'processing' status
- **Rate limiting**: Configurable delay between invocations to avoid overwhelming Lambda
- **Error handling**: Continues processing even if individual invocations fail

## Notes

- The script uses **async Lambda invocation** (`Event` type), so it returns immediately
- Actual reprocessing happens in the background
- Monitor progress in CloudWatch Logs
- No Riot API calls are made (all data read from S3)
- Safe to run multiple times (idempotent)
