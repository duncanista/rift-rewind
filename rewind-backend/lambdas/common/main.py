from fetch_api import RiotAPIClient
import json

DEV_API_KEY = "####"

summoner_name = "duncanista"
summoner_tagline = "LAN"

def main() -> None:
    client = RiotAPIClient(DEV_API_KEY)
    puuid = client.get_puuid(summoner_name, summoner_tagline)
    matches = client.get_matches(puuid)
    for match in matches:
        match_data = client.get_match(match)

        # save match data to json file
        with open("match_data.json", "w") as f:
            json.dump(match_data, f)

        # print(match_data)
        break

if __name__ == "__main__":
    main()