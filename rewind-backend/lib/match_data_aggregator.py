from typing import List, Dict, Any

from lib.match_analyzer import MatchAnalyzer

class MatchDataAggregator:
    """Aggregates match statistics across multiple games for a player."""
    
    def __init__(self, puuid: str, match_data_list: List[Dict[str, Any]]):
        """Initialize aggregator with player puuid and list of match data."""

        self.puuid = puuid
        self.match_data_list = match_data_list
        self.aggregated_data = self.aggregate_match_data()

    def _calculate_per_minute(self, total: float, duration_seconds: int) -> float:
        """Calculate per-minute stat from total and duration."""
        if duration_seconds == 0:
            return 0.0
        return round((total / duration_seconds) * 60, 2)

    def aggregate_match_data(self) -> Dict[str, Any]:
        """Aggregate statistics from all matches including pings, KDA, 
        vision, champions, positions, and enhanced metrics."""

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
            # Enhanced stats
            "champion_stats": {},  # Per-champion detailed stats
            "performance_metrics": {},  # Per-minute averages
            "best_match": None,  # Best performing match
            "worst_match": None,  # Worst performing match
        }

        # Track individual matches for best/worst calculation
        match_performances = []
        
        for match_data in self.match_data_list:
            match_analyzer = MatchAnalyzer(self.puuid, match_data)
            
            # Get match info
            kills, deaths, assists = match_analyzer.get_kda()
            champion = match_analyzer.played_champion()
            position = match_analyzer.played_position()
            won = match_analyzer.is_match_won()
            duration = match_analyzer.get_match_duration()
            cs = match_analyzer.get_cs()
            vision_score = match_analyzer.get_vision_score()
            match_id = match_data.get('metadata', {}).get('matchId', 'unknown')
            
            # Calculate KDA ratio for this match
            kda_ratio = (kills + assists) / deaths if deaths > 0 else (kills + assists)
            
            # Add ping counts
            ping_counts = match_analyzer.get_ping_counts()
            for ping_type, count in ping_counts.items():
                aggregated_data["pings"][ping_type] += count
            
            # Basic aggregation
            aggregated_data["kills"] += kills
            aggregated_data["deaths"] += deaths
            aggregated_data["assists"] += assists
            aggregated_data["cs"] += cs
            aggregated_data["vision_score"] += vision_score
            aggregated_data["wards_placed"] += match_analyzer.get_wards_placed()
            aggregated_data["wards_killed"] += match_analyzer.get_wards_killed()
            aggregated_data["early_surrender"] += match_analyzer.early_surrender()
            aggregated_data["first_blood"] += match_analyzer.got_first_blood()
            aggregated_data["match_duration"] += duration
            aggregated_data["won"] += won
            aggregated_data["lost"] += not won
            
            # Champion counts (legacy)
            if champion in aggregated_data["champions"]:
                aggregated_data["champions"][champion] += 1
            else:
                aggregated_data["champions"][champion] = 1
            
            # Enhanced champion stats
            if champion not in aggregated_data["champion_stats"]:
                aggregated_data["champion_stats"][champion] = {
                    "games": 0,
                    "wins": 0,
                    "losses": 0,
                    "kills": 0,
                    "deaths": 0,
                    "assists": 0,
                    "cs": 0,
                    "vision_score": 0,
                    "duration": 0,
                }
            
            champ_stats = aggregated_data["champion_stats"][champion]
            champ_stats["games"] += 1
            champ_stats["wins"] += won
            champ_stats["losses"] += not won
            champ_stats["kills"] += kills
            champ_stats["deaths"] += deaths
            champ_stats["assists"] += assists
            champ_stats["cs"] += cs
            champ_stats["vision_score"] += vision_score
            champ_stats["duration"] += duration
            
            # Position counts
            if position in aggregated_data["positions"]:
                aggregated_data["positions"][position] += 1
            
            # Track match performance for best/worst
            match_performances.append({
                "match_id": match_id,
                "champion": champion,
                "kda_ratio": kda_ratio,
                "kills": kills,
                "deaths": deaths,
                "assists": assists,
                "cs": cs,
                "vision_score": vision_score,
                "won": won,
                "duration": duration,
            })
        
        # Calculate per-champion averages
        for champion, stats in aggregated_data["champion_stats"].items():
            games = stats["games"]
            if games > 0:
                stats["win_rate"] = round((stats["wins"] / games) * 100, 1)
                stats["avg_kills"] = round(stats["kills"] / games, 1)
                stats["avg_deaths"] = round(stats["deaths"] / games, 1)
                stats["avg_assists"] = round(stats["assists"] / games, 1)
                stats["avg_cs"] = round(stats["cs"] / games, 1)
                stats["avg_vision_score"] = round(stats["vision_score"] / games, 1)
                
                # Calculate per-minute stats for this champion
                if stats["duration"] > 0:
                    stats["cs_per_minute"] = self._calculate_per_minute(stats["cs"], stats["duration"])
                    stats["vision_per_minute"] = self._calculate_per_minute(stats["vision_score"], stats["duration"])
        
        # Calculate overall performance metrics
        total_games = len(self.match_data_list)
        if total_games > 0 and aggregated_data["match_duration"] > 0:
            aggregated_data["performance_metrics"] = {
                "cs_per_minute": self._calculate_per_minute(aggregated_data["cs"], aggregated_data["match_duration"]),
                "vision_per_minute": self._calculate_per_minute(aggregated_data["vision_score"], aggregated_data["match_duration"]),
                "avg_kills": round(aggregated_data["kills"] / total_games, 1),
                "avg_deaths": round(aggregated_data["deaths"] / total_games, 1),
                "avg_assists": round(aggregated_data["assists"] / total_games, 1),
                "avg_cs": round(aggregated_data["cs"] / total_games, 1),
                "avg_vision_score": round(aggregated_data["vision_score"] / total_games, 1),
                "avg_game_duration": round(aggregated_data["match_duration"] / total_games / 60, 1),  # in minutes
            }
        
        # Find best and worst matches
        if match_performances:
            # Best match: highest KDA ratio + win
            wins = [m for m in match_performances if m["won"]]
            if wins:
                best = max(wins, key=lambda x: x["kda_ratio"])
                aggregated_data["best_match"] = {
                    "match_id": best["match_id"],
                    "champion": best["champion"],
                    "kda": f"{best['kills']}/{best['deaths']}/{best['assists']}",
                    "kda_ratio": round(best["kda_ratio"], 2),
                    "cs": best["cs"],
                    "vision_score": best["vision_score"],
                    "won": True,
                }
            
            # Worst match: lowest KDA ratio + loss
            losses = [m for m in match_performances if not m["won"]]
            if losses:
                worst = min(losses, key=lambda x: x["kda_ratio"])
                aggregated_data["worst_match"] = {
                    "match_id": worst["match_id"],
                    "champion": worst["champion"],
                    "kda": f"{worst['kills']}/{worst['deaths']}/{worst['assists']}",
                    "kda_ratio": round(worst["kda_ratio"], 2),
                    "cs": worst["cs"],
                    "vision_score": worst["vision_score"],
                    "won": False,
                }

        return aggregated_data

