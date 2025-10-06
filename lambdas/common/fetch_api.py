import requests
from typing import Dict, List, Any



class RiotAPIClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    def get_puuid(self, summoner_name: str, summoner_tagline: str) -> str:
        account_path = "https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{}/{}?api_key={}".format(summoner_name, summoner_tagline, self.api_key)
        response = requests.get(account_path)
        print(response.json())
        return response.json()["puuid"]
    
    def get_matches(self, puuid: str, count: int = 10) -> List[str]:
        match_path = "https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/{}/ids?type=ranked&start=0&count={}&api_key={}".format(puuid, count, self.api_key)
        response = requests.get(match_path)
        return response.json()
    
    def get_match(self, match_id: str) -> Dict[str, Any]:
        match_path = "https://americas.api.riotgames.com/lol/match/v5/matches/{}?api_key={}".format(match_id, self.api_key)
        response = requests.get(match_path)
        return response.json()




class MatchAnalyzer:
    def __init__(self, puuid: str, match_data: Dict[str, Any]):

        for player in match_data["info"]["participants"]:
            if player["puuid"] == puuid:
                self.player_data = player
                break
        
        self.match_data = match_data

    def get_ping_counts(self) -> Dict[str, int]:
        pings = [
            "allInPings",
            "assistMePings",
            "basicPings",
            "commandPings",
            "dangerPings",
            "enemyMissingPings",
            "enemyVisionPings",
            "getBackPings",
            "holdPings",
            "needVisionPings",
            "onMyWayPings",
            "pushPings",
            "visionClearedPings",
        ]
    
        return {ping: self.player_data[ping] for ping in pings}

    def get_match_duration(self) -> int:
        return self.match_data["info"]["gameDuration"]
    
    def is_match_won(self) -> bool:
        return self.player_data["win"]

    def played_champion(self) -> str:
        return self.player_data["championName"]

    def played_position(self) -> str:
        return self.player_data["individualPosition"]

    def get_kda(self) -> (int, int, int):
        return (self.player_data["kills"], self.player_data["deaths"], self.player_data["assists"])
    
    def get_cs(self) -> int:
        return self.player_data["totalMinionsKilled"]
    
    def get_vision_score(self) -> int:
        return self.player_data["visionScore"]

    def get_wards_placed(self) -> int:
        return self.player_data["wardsPlaced"]
    
    def get_wards_killed(self) -> int:
        return self.player_data["wardsKilled"]

    def early_surrender(self) -> bool:
        return self.player_data["teamEarlySurrendered"]
    
    def got_first_blood(self) -> bool:
        return self.player_data["firstBloodKill"]

    
    def get_match_data(self) -> Dict[str, Any]:
        kills, deaths, assists = self.get_kda()
        
        return {
            "match_duration": self.get_match_duration(),
            "won": self.is_match_won(),
            "champion": self.played_champion(),
            "position": self.played_position(),
            "kills": kills,
            "deaths": deaths,
            "assists": assists,
            "cs": self.get_cs(),
            "vision_score": self.get_vision_score(),
            "wards_placed": self.get_wards_placed(),
            "wards_killed": self.get_wards_killed(),
            "early_surrender": self.early_surrender(),
            "first_blood": self.got_first_blood(),
            "pings": self.get_ping_counts(),
        }
