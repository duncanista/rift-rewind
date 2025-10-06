# Rift Rewind Backend

This directory contains the AWS Lambda functions for the Rift Rewind application.

## Lambda Functions

### Aggregator Lambda

The aggregator Lambda function fetches and aggregates League of Legends match data for a summoner.

**Location**: `lambdas/aggregator/handler.py`

**Handler**: `aggregator.handler.lambda_handler`

**Environment Variables**:
- `RIOT_API_KEY_SECRET_ARN`: ARN of the AWS Secrets Manager secret containing the Riot API key

**Input** (Lambda Function URL):
- **GET**: `?summoner=name%23tagline`
- **POST**: `{"summoner": "name#tagline"}`

**Output**:
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{...aggregated match data...}"
}
```

## Deployment

The Lambda functions are deployed using AWS CDK from the `rewind-infra` directory.

### Prerequisites

1. Set environment variables:
   ```bash
   export RIOT_API_KEY="your-riot-api-key"
   export ENVIRONMENT="dev"  # or "prod"
   export AMPLIFY_APP_ID="your-amplify-app-id"
   ```

2. Install CDK dependencies:
   ```bash
   cd ../rewind-infra
   npm install
   ```

### Deploy

```bash
cd ../rewind-infra
npm run build
npx cdk deploy
```

This will:
1. Create a Secrets Manager secret with your Riot API key
2. Deploy the aggregator Lambda function
3. Create a Lambda Function URL with CORS configured for `riftrewind.lol`
4. Grant the Lambda permission to read the secret

### Testing Locally

```bash
cd lambdas/aggregator
python handler.py
```

Note: Local testing requires AWS credentials configured and a valid Secrets Manager secret.

## Dependencies

Python dependencies are managed in `lambdas/requirements.txt`:
- `requests`: For HTTP requests to Riot API
- `boto3`: For AWS SDK (Secrets Manager)

These are automatically bundled with the Lambda function during CDK deployment.

