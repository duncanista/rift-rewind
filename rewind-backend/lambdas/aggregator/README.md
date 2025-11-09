# Aggregator Lambda

Single lambda that handles fetching, caching, and aggregating League of Legends match data.

## Local Testing

You can test the lambda locally without deploying to AWS using the `local_runner.py` script.

### Prerequisites

1. Install dependencies:
```bash
cd rewind-backend/lambdas
pip install -r requirements.txt
```

2. Set your Riot API key:
```bash
export RIOT_API_KEY="your-riot-api-key"
```

### Basic Usage

```bash
cd rewind-backend/lambdas/aggregator

# Test with a summoner (without S3 caching)
python local_runner.py "SummonerName#TAG" --region kr --skip-s3

# Pretty print the output
python local_runner.py "Hide on bush#KR1" --region kr --skip-s3 --pretty
```

### With S3 Caching

If you want to test with S3 caching (requires AWS credentials):

```bash
# Set up AWS credentials and bucket
export AWS_PROFILE="your-aws-profile"
export STORAGE_BUCKET_NAME="rift-rewind-storage-dev"

# Run with S3 caching enabled
python local_runner.py "duncanista#LAN" --region la1 --pretty
```

### Command Line Options

```
usage: local_runner.py [-h] [--region REGION] [--api-key API_KEY]
                       [--bucket BUCKET] [--skip-s3] [--pretty]
                       summoner

positional arguments:
  summoner           Summoner name in "name#tagline" format

optional arguments:
  --region REGION    Region routing value (americas, europe, asia, kr, etc.)
                     Default: americas
  --api-key API_KEY  Riot API key (overrides RIOT_API_KEY env var)
  --bucket BUCKET    S3 bucket name (overrides STORAGE_BUCKET_NAME env var)
  --skip-s3          Skip S3 caching and fetch fresh data from Riot API
  --pretty           Pretty print the JSON response
```

### Region Values

The `--region` parameter accepts:
- **Routing values**: `americas`, `europe`, `asia`, `sea`
- **Platform IDs**: `na1`, `br1`, `la1`, `la2`, `oc1`, `euw1`, `eun1`, `tr1`, `ru`, `kr`, `jp1`

Platform IDs are automatically mapped to the correct routing value.

### Examples

```bash
# North American player
python local_runner.py "PlayerName#NA1" --region na1 --skip-s3 --pretty

# Korean player
python local_runner.py "Hide on bush#KR1" --region kr --skip-s3 --pretty

# Latin American player (with S3 caching)
export STORAGE_BUCKET_NAME="rift-rewind-storage-dev"
python local_runner.py "duncanista#LAN" --region la1 --pretty

# European player (using environment variable for API key)
export RIOT_API_KEY="your-key"
python local_runner.py "Caps#EUW" --region euw1 --skip-s3
```

## Files

- **handler.py**: Main lambda handler (entry point)
- **aggregator.py**: Data aggregation logic
- **local_runner.py**: Local testing script
- **README.md**: This file

## Lambda Handler

The lambda is deployed with:
- **Timeout**: 60 seconds
- **Memory**: 1024 MB
- **Environment Variables**:
  - `RIOT_API_KEY_SECRET_ARN`: ARN of the Riot API key in Secrets Manager
  - `STORAGE_BUCKET_NAME`: S3 bucket name for caching

## API

### Request Format

```json
{
  "summoner": "name#tagline",
  "region": "kr"
}
```

### Response Format

```json
{
  "status": "done",
  "summoner": "name#tagline",
  "region": "kr",
  "puuid": "...",
  "total_matches": 10,
  "total_wins": 6,
  "total_losses": 4,
  "win_rate": 0.6,
  "champion_stats": {...},
  "position_stats": {...},
  ...
}
```

### Error Response

```json
{
  "error": "Error message here"
}
```

## Architecture

This lambda implements a complete flow:
1. Check S3 for cached aggregate data
2. If cached and complete, return immediately
3. If cached and pending, retry with delays
4. If not cached, fetch matches from Riot API
5. Use S3 cache for individual match data when available
6. Aggregate the data
7. Store in S3 with `status=done`
8. Return the result

See `SINGLE_LAMBDA_MIGRATION.md` in the project root for more details.

