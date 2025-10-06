'''
This lambda will receive messages from a SQS queue,
and aggregate the data into a single JSON object.
It will then send the JSON object to a DynamoDB table.
'''

import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.fetch_api import RiotAPIClient
from aggregator.aggregator import MatchDataAggregator

DEV_API_KEY = "####"

summoner_name = "duncanista"
summoner_tagline = "LAN"

# TEMPORARY
# Fetch last 10 matches directly from API
# and aggregate the data into a single JSON object
def main() -> None:
    client = RiotAPIClient(DEV_API_KEY)
    puuid = client.get_puuid(summoner_name, summoner_tagline)
    matches = client.get_matches(puuid, count=10)

    match_data_list = []
    for match in matches:
        match_data = client.get_match(match)
        match_data_list.append(match_data)

    aggregator = MatchDataAggregator(puuid, match_data_list)

    # write to file
    with open("aggregated_data.json", "w") as f:
        json.dump(aggregator.aggregated_data, f)


if __name__ == "__main__":
    main()