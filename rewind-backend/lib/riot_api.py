import requests
from typing import Dict, List, Any

class RiotAPIClient:
    # Regional routing mapping
    REGION_ROUTING = {
        'na1': 'americas',
        'br1': 'americas',
        'la1': 'americas',
        'la2': 'americas',
        'oc1': 'americas',
        'euw1': 'europe',
        'eun1': 'europe',
        'tr1': 'europe',
        'ru': 'europe',
        'kr': 'asia',
        'jp1': 'asia',
    }
    
    def __init__(self, api_key: str, region: str = 'americas', data_store=None):
        self.api_key = api_key
        # If region is a platform ID (e.g., 'na1', 'kr'), map it to routing value
        self.routing = self.REGION_ROUTING.get(region.lower(), region.lower())
        # Validate routing value
        if self.routing not in ['americas', 'europe', 'asia', 'sea']:
            # Default to americas if unknown
            print(f"Warning: Unknown region '{region}', defaulting to 'americas'")
            self.routing = 'americas'
        # Optional DataStore for caching
        self.data_store = data_store
    
    def get_puuid(self, summoner_name: str, summoner_tagline: str) -> str:
        account_path = "https://{}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{}/{}?api_key={}".format(
            self.routing, summoner_name, summoner_tagline, self.api_key
        )
        response = requests.get(account_path)
        response.raise_for_status()  # Raise an exception for bad status codes
        data = response.json()
        print(f"Account lookup response: {data}")
        
        if 'puuid' not in data:
            raise ValueError(f"Account not found for {summoner_name}#{summoner_tagline}")
        
        return data["puuid"]
    
    def get_matches(self, puuid: str, count: int = 10) -> List[str]:
        match_path = "https://{}.api.riotgames.com/lol/match/v5/matches/by-puuid/{}/ids?type=ranked&start=0&count={}&api_key={}".format(
            self.routing, puuid, count, self.api_key
        )
        response = requests.get(match_path)
        response.raise_for_status()  # Raise an exception for bad status codes
        matches = response.json()
        
        if not isinstance(matches, list):
            raise ValueError(f"Unexpected response format from matches API: {matches}")
        
        print(f"Found {len(matches)} ranked matches for PUUID: {puuid}")
        return matches
    
    def get_match(self, match_id: str) -> Dict[str, Any]:
        """
        Get match data, checking S3 cache first if DataStore is available.
        
        Args:
            match_id: The match ID to fetch
            
        Returns:
            Full match data dictionary
        """
        # Try to get from cache first if data_store is available
        if self.data_store:
            found, cached_data = self.data_store.get_match_data(match_id)
            if found:
                print(f"Cache HIT for match {match_id}")
                return cached_data
            print(f"Cache MISS for match {match_id}, fetching from API")
        
        # Fetch from API
        match_path = "https://{}.api.riotgames.com/lol/match/v5/matches/{}?api_key={}".format(
            self.routing, match_id, self.api_key
        )
        response = requests.get(match_path)
        response.raise_for_status()  # Raise an exception for bad status codes
        match_data = response.json()
        
        # Store in cache if data_store is available
        if self.data_store:
            try:
                self.data_store.set_match_data(match_id, match_data)
                print(f"Cached match {match_id}")
            except Exception as e:
                print(f"Warning: Failed to cache match {match_id}: {str(e)}")
        
        return match_data
