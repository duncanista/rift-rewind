import sys
from pathlib import Path

# Import library from root directory
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.riot_api import RiotAPIClient
import json

DEV_API_KEY = "###"

summoner_name = "duncanista"
summoner_tagline = "LAN"

def main() -> None:
    client = RiotAPIClient(DEV_API_KEY)
    puuid = client.get_puuid(summoner_name, summoner_tagline)
    matches = client.get_matches(puuid)
    for match in matches:
        match_data = client.get_match(match)

        # save match data to json file
        with open("tests/get_matches/matches.json", "w") as f:
            json.dump(match_data, f, indent=4)

        # print(match_data)
        break

if __name__ == "__main__":
    main()