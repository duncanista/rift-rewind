import json
import os
import boto3
from botocore.exceptions import ClientError
from typing import Dict, Tuple, Optional


class DataStore:
    """
    S3-backed data store for caching match data and aggregated results.
    
    Structure:
    - Users/{puuid}/aggregate.json - Aggregated data with status field
    - Matches/{match_id}.json - Individual match data
    """
    
    S3_USERS_PATH = "Users"
    S3_MATCHES_PATH = "Matches"
    S3_AGGREGATE_FILENAME = "aggregate.json"
    
    def __init__(self, bucket_name: Optional[str] = None):
        """
        Initialize the DataStore with an S3 client.
        
        Args:
            bucket_name: S3 bucket name. If not provided, reads from STORAGE_BUCKET_NAME env var
        """
        self.client = boto3.client("s3")
        self.bucket_name = bucket_name or os.environ.get("STORAGE_BUCKET_NAME")
        
        if not self.bucket_name:
            raise ValueError("Bucket name must be provided or set in STORAGE_BUCKET_NAME environment variable")
    
    def get_aggregate_data(self, puuid: str) -> Tuple[bool, bool, Dict]:
        """
        Fetch a user's aggregate data from S3.
        
        Args:
            puuid: The player's PUUID
            
        Returns:
            Tuple of (found, is_complete, data) where:
            - found: Whether the file exists in S3
            - is_complete: Whether the status field is "done"
            - data: The aggregate data dict (empty if not found)
        """
        data_path = f"{self.S3_USERS_PATH}/{puuid}/{self.S3_AGGREGATE_FILENAME}"
        
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=data_path)
            data = json.loads(response['Body'].read().decode('utf-8'))
            is_complete = data.get("status", "") == "done"
            return True, is_complete, data
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return False, False, {}
            else:
                # Re-raise unexpected errors
                raise

    def set_aggregate_data(self, puuid: str, data: Dict) -> None:
        """
        Store aggregated data in S3.
        
        Args:
            puuid: The player's PUUID
            data: The aggregated data to store (should include a "status" field)
        """
        data_path = f"{self.S3_USERS_PATH}/{puuid}/{self.S3_AGGREGATE_FILENAME}"
        
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=data_path,
            Body=json.dumps(data),
            ContentType='application/json'
        )
    
    def get_match_data(self, match_id: str) -> Tuple[bool, Dict]:
        """
        Fetch match data from S3 cache.
        
        Args:
            match_id: The match ID
            
        Returns:
            Tuple of (found, data) where:
            - found: Whether the match data exists in S3
            - data: The match data dict (empty if not found)
        """
        data_path = f"{self.S3_MATCHES_PATH}/{match_id}.json"
        
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=data_path)
            data = json.loads(response['Body'].read().decode('utf-8'))
            return True, data
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return False, {}
            else:
                # Re-raise unexpected errors
                raise

    def set_match_data(self, match_id: str, match_data: Dict) -> None:
        """
        Store match data in S3 cache.
        
        Args:
            match_id: The match ID
            match_data: The full match data from Riot API
        """
        data_path = f"{self.S3_MATCHES_PATH}/{match_id}.json"
        
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=data_path,
            Body=json.dumps(match_data),
            ContentType='application/json'
        )
