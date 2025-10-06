# Lambda Integration Summary

## Changes Made

### 1. Home Page (`rewind-ui/src/app/page.tsx`)
- **Changed UID format**: Now redirects using `Name#Tag` format instead of random UUID
- Encodes the Riot ID for URL safety using `encodeURIComponent()`
- Example: User enters "duncanista#LAN" → redirects to `/chronobreak/duncanista%23LAN`

### 2. Chronobreak Page (`rewind-ui/src/app/chronobreak/[uid]/page.tsx`)

#### Added Lambda Integration:
- **Lambda URL**: `https://4yry7prgvpiu6gralibuy5aepa0czkqp.lambda-url.us-east-1.on.aws/`
- **TypeScript Interface**: Added `AggregatedData` type for type safety
- **Data Fetching**: Fetches match data immediately on page load using POST request
- **Loading States**: 
  - `isLoading`: Shows while fetching data
  - `error`: Shows if fetch fails
  - `aggregatedData`: Stores the fetched data

#### UI Updates:
- **Button States**:
  - **Loading**: Shows spinner and "Loading..." text, disabled
  - **Ready**: Shows "View Your Rewind", enabled
  - **Error**: Falls back to mock data, button still works
  
- **Status Messages**:
  - Loading: "Fetching your match data..."
  - Error: "Using sample data..."
  - Success: "Your data is ready!"

#### Data Flow:
1. Page loads with summoner name from URL (e.g., `duncanista%23LAN`)
2. Decodes the summoner name
3. Sends POST request to Lambda:
   ```json
   {
     "summoner": "duncanista#LAN"
   }
   ```
4. Lambda returns aggregated data (status 200)
5. Updates UI with real data
6. Enables "View Your Rewind" button
7. If error occurs, falls back to mock data

#### Fallback Behavior:
- If Lambda fails or returns error, the app uses `MOCK_AGGREGATED_DATA`
- User can still view the rewind with sample data
- Error is logged to console for debugging

### 3. Backend Lambda (`rewind-backend/lambdas/aggregator/handler.py`)
- Reads API key from AWS Secrets Manager
- Accepts POST requests with `{"summoner": "name#tagline"}`
- Fetches last 10 ranked matches from Riot API
- Aggregates match statistics
- Returns JSON response with CORS headers

### 4. Infrastructure (`rewind-infra/lib/rewind-infra-stack.ts`)
- Creates Secrets Manager secret with Riot API key
- Deploys Lambda function with Python 3.12
- Bundles dependencies (requests, boto3)
- Creates Lambda Function URL with CORS:
  - Allowed origins: `https://riftrewind.lol`, `https://www.riftrewind.lol`
  - Allowed methods: POST only
  - No authentication (public)

## Testing

### Test the Full Flow:

1. **Start the dev server**:
   ```bash
   cd rewind-ui
   npm run dev
   ```

2. **Enter a summoner name**: 
   - Go to `http://localhost:3000`
   - Enter: `duncanista#LAN`
   - Click "REWIND"

3. **Watch the transition**:
   - Fade to black
   - Ekko chronobreak video plays
   - Redirects to chronobreak page

4. **Data fetching**:
   - Button shows "Loading..." with spinner
   - Lambda fetches match data
   - Button enables when ready
   - Click to view the rewind

### Test Directly:

```bash
# Test Lambda URL directly
curl -X POST https://4yry7prgvpiu6gralibuy5aepa0czkqp.lambda-url.us-east-1.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{"summoner": "duncanista#LAN"}'
```

### Check Browser Console:
- Look for: `Fetching data for summoner: duncanista#LAN`
- Look for: `Data fetched successfully: {...}`
- Any errors will be logged

## Environment Variables Required

### For Deployment:
```bash
export RIOT_API_KEY="RGAPI-..."
export ENVIRONMENT="dev"
export AMPLIFY_APP_ID="d16js7ngmw2x1a"
```

### Lambda Environment (automatic):
- `RIOT_API_KEY_SECRET_ARN`: Set by CDK stack

## Files Modified

1. `rewind-ui/src/app/page.tsx` - Changed UID to Name#Tag format
2. `rewind-ui/src/app/chronobreak/[uid]/page.tsx` - Added Lambda integration and loading states
3. `rewind-backend/lambdas/aggregator/handler.py` - Lambda handler with Secrets Manager
4. `rewind-infra/lib/rewind-infra-stack.ts` - Lambda and Secrets Manager infrastructure
5. `rewind-backend/lambdas/requirements.txt` - Python dependencies

## Next Steps

- [ ] Add proper champion splash art URLs from Data Dragon
- [ ] Add error boundary for better error handling
- [ ] Add retry logic for failed Lambda requests
- [ ] Cache Lambda responses to avoid redundant API calls
- [ ] Add analytics to track successful fetches
- [ ] Consider adding pagination for more than 10 matches

