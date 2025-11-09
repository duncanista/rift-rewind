#!/usr/bin/env python3
"""
Local runner for testing the aggregator lambda without deploying to AWS.

Usage:
    python local_runner.py "summoner#tagline" --region kr
    
Environment Variables:
    RIOT_API_KEY: Your Riot API key (required)
    STORAGE_BUCKET_NAME: S3 bucket name (optional, will skip S3 caching if not set)
    AWS_PROFILE: AWS profile to use for S3 access (optional)
"""

import json
import os
import sys
import argparse
from pathlib import Path

# Add parent directory to path so we can import from common and aggregator
sys.path.insert(0, str(Path(__file__).parent.parent))

from handler import lambda_handler


def create_test_event(summoner: str, region: str = 'americas') -> dict:
    """
    Create a test event that mimics the Lambda Function URL event structure.
    
    Args:
        summoner: Summoner name in "name#tagline" format
        region: Region/routing value (americas, europe, asia, etc.)
        
    Returns:
        Dictionary mimicking Lambda Function URL event
    """
    return {
        'body': json.dumps({
            'summoner': summoner,
            'region': region
        }),
        'headers': {
            'content-type': 'application/json'
        },
        'requestContext': {
            'http': {
                'method': 'POST'
            }
        }
    }


def setup_environment(api_key: str = None, bucket_name: str = None, skip_s3: bool = False):
    """
    Set up environment variables for local testing.
    
    Args:
        api_key: Riot API key (if not already set)
        bucket_name: S3 bucket name (if not already set)
        skip_s3: If True, don't use S3 caching (for testing without AWS)
    """
    # Set API key
    if api_key:
        os.environ['RIOT_API_KEY'] = api_key
    
    if not os.environ.get('RIOT_API_KEY'):
        print("Error: RIOT_API_KEY environment variable is not set")
        print("Set it with: export RIOT_API_KEY='your-api-key'")
        sys.exit(1)
    
    # For local testing, we'll use the API key directly instead of Secrets Manager
    # Set a mock ARN that the handler will recognize
    os.environ['RIOT_API_KEY_SECRET_ARN'] = 'local-testing'
    
    # Handle S3 bucket
    if skip_s3:
        # Remove bucket name to disable S3 caching
        if 'STORAGE_BUCKET_NAME' in os.environ:
            del os.environ['STORAGE_BUCKET_NAME']
        print("⚠️  S3 caching disabled - will fetch fresh data from Riot API")
    elif bucket_name:
        os.environ['STORAGE_BUCKET_NAME'] = bucket_name
    elif os.environ.get('STORAGE_BUCKET_NAME'):
        print(f"📦 Using S3 bucket: {os.environ.get('STORAGE_BUCKET_NAME')}")
    else:
        print("⚠️  STORAGE_BUCKET_NAME not set - S3 caching will be disabled")
        print("   Set it with: export STORAGE_BUCKET_NAME='your-bucket-name'")


def patch_secrets_manager():
    """
    Patch the get_api_key_from_secrets_manager function to use local API key.
    """
    import handler
    
    def mock_get_api_key(secret_arn: str) -> str:
        if secret_arn == 'local-testing':
            return os.environ['RIOT_API_KEY']
        # If real ARN is provided, try to use it
        return handler.get_api_key_from_secrets_manager(secret_arn)
    
    handler.get_api_key_from_secrets_manager = mock_get_api_key


def main():
    parser = argparse.ArgumentParser(
        description='Run the aggregator lambda locally for testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage (using environment variables)
  export RIOT_API_KEY="your-api-key"
  python local_runner.py "Hide on bush#KR1" --region kr
  
  # With S3 caching
  export STORAGE_BUCKET_NAME="rift-rewind-storage-dev"
  export AWS_PROFILE="your-profile"
  python local_runner.py "duncanista#LAN" --region la1
  
  # Without S3 caching (fresh API calls only)
  python local_runner.py "SummonerName#TAG" --skip-s3
        """
    )
    
    parser.add_argument(
        'summoner',
        help='Summoner name in "name#tagline" format'
    )
    parser.add_argument(
        '--region',
        default='americas',
        help='Region routing value (americas, europe, asia, kr, etc.). Default: americas'
    )
    parser.add_argument(
        '--api-key',
        help='Riot API key (overrides RIOT_API_KEY env var)'
    )
    parser.add_argument(
        '--bucket',
        help='S3 bucket name (overrides STORAGE_BUCKET_NAME env var)'
    )
    parser.add_argument(
        '--skip-s3',
        action='store_true',
        help='Skip S3 caching and fetch fresh data from Riot API'
    )
    parser.add_argument(
        '--pretty',
        action='store_true',
        help='Pretty print the JSON response'
    )
    
    args = parser.parse_args()
    
    # Validate summoner format
    if '#' not in args.summoner:
        print(f"Error: Invalid summoner format. Expected 'name#tagline', got '{args.summoner}'")
        sys.exit(1)
    
    # Setup environment
    setup_environment(
        api_key=args.api_key,
        bucket_name=args.bucket,
        skip_s3=args.skip_s3
    )
    
    # Patch Secrets Manager to use local API key
    patch_secrets_manager()
    
    # Create test event
    event = create_test_event(args.summoner, args.region)
    
    print(f"\n{'='*60}")
    print(f"🎮 Testing aggregator lambda locally")
    print(f"{'='*60}")
    print(f"Summoner: {args.summoner}")
    print(f"Region: {args.region}")
    print(f"{'='*60}\n")
    
    # Call the lambda handler
    try:
        response = lambda_handler(event, None)
        
        # Parse and display response
        status_code = response.get('statusCode', 500)
        body = response.get('body', '{}')
        
        if isinstance(body, str):
            body = json.loads(body)
        
        print(f"\n{'='*60}")
        print(f"📊 Response (Status: {status_code})")
        print(f"{'='*60}\n")
        
        if args.pretty:
            print(json.dumps(body, indent=2))
        else:
            print(json.dumps(body))
        
        print(f"\n{'='*60}\n")
        
        # Exit with appropriate code
        sys.exit(0 if status_code == 200 else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

