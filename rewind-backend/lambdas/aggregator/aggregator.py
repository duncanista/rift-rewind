from typing import List, Dict, Any

from common.fetch_api import MatchAnalyzer


class MatchDataAggregator:
    def __init__(self, puuid: str, match_data_list: List[Dict[str, Any]]):
        self.puuid = puuid
        self.match_data_list = match_data_list
        self.aggregated_data = self.aggregate_match_data()

    def aggregate_match_data(self) -> Dict[str, Any]:
        aggregated_data = {
            "pings": {
                "allInPings": 0,
                "assistMePings": 0,
                "basicPings": 0,
                "commandPings": 0,
                "dangerPings": 0,
                "enemyMissingPings": 0,
                "enemyVisionPings": 0,
                "getBackPings": 0,
                "holdPings": 0,
                "needVisionPings": 0,
                "onMyWayPings": 0,
                "pushPings": 0,
                "visionClearedPings": 0,
            },
            "kills": 0,
            "deaths": 0,
            "assists": 0,
            "cs": 0,
            "vision_score": 0,
            "wards_placed": 0,
            "wards_killed": 0,
            "early_surrender": 0,
            "first_blood": 0,
            "match_duration": 0,
            "won": 0,
            "lost": 0,
            "champions": {},
            "positions": {
                "TOP": 0,
                "JUNGLE": 0,
                "MIDDLE": 0,
                "BOTTOM": 0,
                "UTILITY": 0,
            },
        }

        for match_data in self.match_data_list:
            match_analyzer = MatchAnalyzer(self.puuid, match_data)
            
            # Add ping counts
            ping_counts = match_analyzer.get_ping_counts()
            for ping_type, count in ping_counts.items():
                aggregated_data["pings"][ping_type] += count
            
            aggregated_data["kills"] += match_analyzer.get_kda()[0]
            aggregated_data["deaths"] += match_analyzer.get_kda()[1]
            aggregated_data["assists"] += match_analyzer.get_kda()[2]
            aggregated_data["cs"] += match_analyzer.get_cs()
            aggregated_data["vision_score"] += match_analyzer.get_vision_score()
            aggregated_data["wards_placed"] += match_analyzer.get_wards_placed()
            aggregated_data["wards_killed"] += match_analyzer.get_wards_killed()
            aggregated_data["early_surrender"] += match_analyzer.early_surrender()
            aggregated_data["first_blood"] += match_analyzer.got_first_blood()
            aggregated_data["match_duration"] += match_analyzer.get_match_duration()
            aggregated_data["won"] += match_analyzer.is_match_won()
            aggregated_data["lost"] += not match_analyzer.is_match_won()
            
            # Add champion counts
            champion = match_analyzer.played_champion()
            if champion in aggregated_data["champions"]:
                aggregated_data["champions"][champion] += 1
            else:
                aggregated_data["champions"][champion] = 1
            
            # Add position counts
            position = match_analyzer.played_position()
            if position in aggregated_data["positions"]:
                aggregated_data["positions"][position] += 1

        return aggregated_data

