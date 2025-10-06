# Bug Fix: Empty Data for Korean Account "Hide on bush#KR1"

## Problem
The backend was returning empty data for user `Hide on bush#KR1` while `Duncanista#LAN` worked correctly.

## Root Cause
The issue was caused by **incorrect regional routing** for Riot API calls. The backend was hardcoded to use `americas.api.riotgames.com` for all API requests, but Riot's API requires different routing values based on the region:

- **Americas**: `americas.api.riotgames.com` (NA, BR, LAN, LAS, OCE)
- **Asia**: `asia.api.riotgames.com` (KR, JP)
- **Europe**: `europe.api.riotgames.com` (EUW, EUNE, TR, RU)

Since "Hide on bush#KR1" is a Korean account, requests must be sent to `asia.api.riotgames.com`, not `americas.api.riotgames.com`.

Additionally, the frontend was collecting the region parameter but **not passing it to the backend**.

## Changes Made

### 1. Backend: `rewind-backend/lambdas/common/fetch_api.py`
- Added regional routing mapping dictionary
- Modified `RiotAPIClient.__init__()` to accept a `region` parameter
- Updated all API endpoint URLs to use the correct regional routing value
- Added error handling with `response.raise_for_status()`
- Added validation for empty/invalid responses
- Added logging for better debugging

### 2. Backend: `rewind-backend/lambdas/aggregator/handler.py`
- Updated `lambda_handler()` to parse `region` from query parameters or POST body
- Added region parameter to `RiotAPIClient` initialization
- Added comprehensive error handling for:
  - Account not found (404)
  - Empty match lists (returns informative message)
  - Failed match data fetches
- Added detailed logging with traceback
- Updated documentation strings with region parameter examples
- Updated test cases to include region parameter

### 3. Frontend: `rewind-ui/src/app/page.tsx`
- Updated navigation to pass region as URL query parameter
- Modified redirect URLs to include `?region={region}` parameter

### 4. Frontend: `rewind-ui/src/app/chronobreak/[uid]/page.tsx`
- Extract region from URL query parameters
- Pass region to backend API call in request body
- Updated logging to show region being used
- Added region to useEffect dependencies

## API Usage Examples

### Query Parameters (GET)
```
?summoner=Hide%20on%20bush%23KR1&region=kr
```

### POST Body
```json
{
  "summoner": "Hide on bush#KR1",
  "region": "kr"
}
```

## Testing
To test the fix:

1. **For Korean accounts**: Use region `kr` (e.g., "Hide on bush#KR1")
2. **For LAN accounts**: Use region `la1` (e.g., "Duncanista#LAN")
3. **For NA accounts**: Use region `na1`

The backend will automatically map platform IDs (like `kr`, `na1`, `la1`) to the correct routing values (`asia`, `americas`, etc.).

## Additional Improvements
- Better error messages for users
- Graceful handling of empty match lists
- Logging for debugging production issues
- Fallback to default region if not provided (defaults to 'americas')

