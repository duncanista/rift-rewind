from typing import Dict, Any

class MatchAnalyzer:
    def __init__(self, puuid: str, match_data: Dict[str, Any]):
        """Initialize analyzer with player puuid and match data."""

        for player in match_data["info"]["participants"]:
            if player["puuid"] == puuid:
                self.player_data = player
                break
        
        self.match_data = match_data

    def get_ping_counts(self) -> Dict[str, int]:
        """Get ping counts for the player in the match."""
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
        """Get the duration of the match in seconds."""
        return self.match_data["info"]["gameDuration"]
    
    def is_match_won(self) -> bool:
        """Check if the player won the match."""
        return self.player_data["win"]

    def played_champion(self) -> str:
        """Get the champion the player played in the match."""
        return self.player_data["championName"]

    def played_position(self) -> str:
        """Get the position the player played in the match."""
        return self.player_data["individualPosition"]

    def get_kda(self) -> (int, int, int):
        """Get the KDA for the player in the match."""
        return (self.player_data["kills"], self.player_data["deaths"], self.player_data["assists"])
    
    def get_cs(self) -> int:
        """Get the CS for the player in the match."""
        return self.player_data["totalMinionsKilled"]
    
    def get_vision_score(self) -> int:
        """Get the vision score for the player in the match."""
        return self.player_data["visionScore"]

    def get_wards_placed(self) -> int:
        """Get the wards placed for the player in the match."""
        return self.player_data["wardsPlaced"]
    
    def get_wards_killed(self) -> int:
        """Get the wards killed for the player in the match."""
        return self.player_data["wardsKilled"]

    def early_surrender(self) -> bool:
        """Check if the player early surrendered in the match."""
        return self.player_data["teamEarlySurrendered"]
    
    def got_first_blood(self) -> bool:
        """Check if the player got first blood in the match."""
        return self.player_data["firstBloodKill"]

    
    def get_match_data(self) -> Dict[str, Any]:
        """Get the match data for the player in the match."""
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
