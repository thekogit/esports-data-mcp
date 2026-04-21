# Design Doc: Polymarket Integration for Enhanced Betting Predictions

**Date:** 2026-04-21
**Topic:** Integrating Polymarket probabilities as a confirmation signal for esports betting.

## 1. Objective
Enhance the reliability of the `analysis-mcp` betting recommendations by using Polymarket's implied probabilities (wisdom of the crowd) as a "Confirmation Signal." This helps protect the model against blind spots (e.g., unreported roster changes) by requiring agreement between the model and the prediction market before a strong recommendation is issued.

## 2. Architecture & Data Flow

### 2.1. New Utility: `src/utils/polymarket.ts`
- **Purpose**: Fetch real-time market-implied probabilities from Polymarket.
- **Service**: Polymarket Gamma API (`https://gamma-api.polymarket.com/markets`).
- **Functionality**:
    - `getPolymarketProbability(teamA: string, teamB: string)`: 
        - Queries the Gamma API using team names as keywords.
        - Filters for `active` markets.
        - Matches team names in the market question or slug.
        - Returns the price of the "Yes" outcome for Team A (represented as 0.0 to 1.0).
- **Mapping Strategy**:
    - Uses the `query` parameter for broad matching.
    - Picks the market with the highest volume/liquidity if multiple matches exist.
    - Validates that both team names are present in the market description.

### 2.2. Analysis Engine Updates: `src/analysis.ts`
- **Tool Update**: `get_optimal_bet_strategy`
    - **New Param**: `polymarketProbabilityTeamA?: number`.
- **Consensus Logic**:
    - **Confirmed Strong Value**: Requires `EV_Bookmaker > 0.10` AND `EV_Market > 0` (Model Probability > Polymarket Probability).
    - **Market Validation States**:
        - `Confirmed`: Both model and market agree on value.
        - `Divergent`: Model sees value, but market sentiment is lower (trigger caution).
        - `No Market Data`: Fallback to standard model analysis.

## 3. Implementation Details

### 3.1. Fetching Logic
```typescript
// Proposed fetch logic
const url = `https://gamma-api.polymarket.com/markets?active=true&query=${encodeURIComponent(teamA + " " + teamB)}`;
const response = await fetch(url);
const markets = await response.json();
// Select highest volume market containing both teamA and teamB
```

### 3.2. Analysis Logic
```typescript
const evMarket = (modelProb / polymarketProb) - 1;
const isConfirmed = evBookmaker > 0 && evMarket > 0;
```

## 4. Error Handling & Edge Cases
- **No Match Found**: System proceeds with a "Model Only" label.
- **Ambiguous Markets**: If multiple active matches exist for the same teams (e.g., Map 1 vs Series), we prioritize the "Series/Match Winner" market based on volume and metadata keywords.
- **API Failure**: Graceful degradation to model-only analysis.

## 5. Testing Strategy
- **Unit Tests**: Test the mapping logic with various team name formats.
- **Integration Tests**: Mock Polymarket API responses to verify the "Confirmed" vs "Divergent" logic in `get_optimal_bet_strategy`.
