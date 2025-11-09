import requests
from typing import Dict, List, Any, Optional

CUT_OFF_START_TIME = 1735689600

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
    
    def __init__(self, api_key: str, region: str = 'americas'):
        self.api_key = api_key
        # If region is a platform ID (e.g., 'na1', 'kr'), map it to routing value
        self.routing = self.REGION_ROUTING.get(region.lower(), region.lower())
        # Validate routing value
        if self.routing not in ['americas', 'europe', 'asia', 'sea']:
            # Default to americas if unknown
            print(f"Warning: Unknown region '{region}', defaulting to 'americas'")
            self.routing = 'americas'
    
    def get_puuid(self, summoner_name: str, summoner_tagline: str) -> str:
        account_path = "https://{}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{}/{}?api_key={}".format(
            self.routing, summoner_name, summoner_tagline, self.api_key
        )
        try:
            response = requests.get(account_path)
            response.raise_for_status()  # Raise an exception for bad status codes
            data = response.json()
            print(f"Account lookup response: {data}")
            
            if 'puuid' not in data:
                raise ValueError(f"Account not found for {summoner_name}#{summoner_tagline}")
            
            return data["puuid"]
        except requests.HTTPError as e:
            # Sanitize error message to not expose API key
            status_code = e.response.status_code if e.response else "unknown"
            raise requests.HTTPError(f"Riot API error (status {status_code}): Failed to fetch account for {summoner_name}#{summoner_tagline}") from None
    
    def get_matches(self, puuid: str, start: int = 0, count: int = 10) -> List[str]:
        match_path = "https://{}.api.riotgames.com/lol/match/v5/matches/by-puuid/{}/ids?type=ranked&start={}&count={}&api_key={}&startTime={}".format(
            self.routing, puuid, start, count, self.api_key, CUT_OFF_START_TIME
        )
        try:
            response = requests.get(match_path)
            response.raise_for_status()  # Raise an exception for bad status codes
            matches = response.json()
            
            if not isinstance(matches, list):
                raise ValueError(f"Unexpected response format from matches API: {matches}")
            
            print(f"Found {len(matches)} ranked matches for PUUID: {puuid}")
            return matches
        except requests.HTTPError as e:
            # Sanitize error message to not expose API key
            status_code = e.response.status_code if e.response else "unknown"
            raise requests.HTTPError(f"Riot API error (status {status_code}): Failed to fetch matches for user") from None
    
    def get_match(self, match_id: str) -> Dict[str, Any]:
        match_path = "https://{}.api.riotgames.com/lol/match/v5/matches/{}?api_key={}".format(
            self.routing, match_id, self.api_key
        )
        try:
            response = requests.get(match_path)
            response.raise_for_status()  # Raise an exception for bad status codes
            return response.json()
        except requests.HTTPError as e:
            # Sanitize error message to not expose API key
            status_code = e.response.status_code if e.response else "unknown"
            raise requests.HTTPError(f"Riot API error (status {status_code}): Failed to fetch match {match_id}") from None
