'''
Common AWS utility functions for Lambda handlers.
'''

import json
import boto3
from typing import Optional
from botocore.exceptions import ClientError

# Cache for secrets to avoid multiple Secrets Manager calls
_secret_cache: dict[str, str] = {}


def get_secret_from_secrets_manager(
    secret_arn: str,
    key_name: Optional[str] = None
) -> str:
    """
    Retrieve a secret value from AWS Secrets Manager.
    
    Args:
        secret_arn: The ARN of the secret in Secrets Manager
        key_name: Optional key name to extract from JSON secret.
                  If None, will try common keys ('api_key', 'RIOT_API_KEY', 'API_KEY')
                  or return the first value if JSON, or the raw string.
    
    Returns:
        The secret value string
    
    Raises:
        Exception: If unable to retrieve the secret or key not found
    """
    # Check cache first
    cache_key = f"{secret_arn}:{key_name or 'default'}"
    if cache_key in _secret_cache:
        return _secret_cache[cache_key]
    
    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager')
    
    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_arn)
    except ClientError as e:
        raise Exception(f"Failed to retrieve secret: {str(e)}")
    
    # Parse the secret value
    if 'SecretString' in get_secret_value_response:
        secret = get_secret_value_response['SecretString']
        
        # Try to parse as JSON
        try:
            secret_dict = json.loads(secret)
            
            # If key_name is specified, use it
            if key_name:
                if key_name not in secret_dict:
                    raise Exception(f"Key '{key_name}' not found in secret JSON")
                secret_value = secret_dict[key_name]
            else:
                # Try common key names
                secret_value = (
                    secret_dict.get('api_key') or
                    secret_dict.get('RIOT_API_KEY') or
                    secret_dict.get('API_KEY') or
                    # If no common key, use the first value
                    (list(secret_dict.values())[0] if secret_dict else None)
                )
        except json.JSONDecodeError:
            # If it's not JSON, use the raw string
            secret_value = secret
    else:
        raise Exception("Secret does not contain a string value")
    
    if not secret_value:
        raise Exception("Secret value not found")
    
    # Cache the secret value
    _secret_cache[cache_key] = secret_value
    return secret_value

