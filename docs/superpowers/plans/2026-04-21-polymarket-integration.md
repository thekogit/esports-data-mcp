# Polymarket Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Polymarket implied probabilities as a confirmation signal for esports betting recommendations.

**Architecture:** Create a new utility to fetch market data from Polymarket's Gamma API and update the `get_optimal_bet_strategy` tool to use this data for consensus-based validation.

**Tech Stack:** TypeScript, Axios (via `fetchJson` utility), Jest for testing.

---

### Task 1: Create Polymarket Utility

**Files:**
- Create: `src/utils/polymarket.ts`
- Create: `src/utils/polymarket.test.ts`

- [ ] **Step 1: Write a failing test for `getPolymarketProbability`**

```typescript
import { getPolymarketProbability } from './polymarket';

describe('getPolymarketProbability', () => {
  it('returns probability for a valid match', async () => {
    // We will mock fetchJson in the next steps, for now just define the interface
    const prob = await getPolymarketProbability('G2', 'Navi');
    expect(typeof prob).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/utils/polymarket.test.ts`
Expected: FAIL (Module not found)

- [ ] **Step 3: Implement `getPolymarketProbability` in `src/utils/polymarket.ts`**

```typescript
import { fetchJson } from './fetcher';

export async function getPolymarketProbability(teamA: string, teamB: string): Promise<number | null> {
  try {
    const query = encodeURIComponent(`${teamA} ${teamB}`);
    const url = `https://gamma-api.polymarket.com/markets?active=true&query=${query}&limit=10`;
    const markets = await fetchJson(url);

    if (!Array.isArray(markets) || markets.length === 0) {
      return null;
    }

    // Filter for markets that contain BOTH team names in their question or description
    const relevantMarket = markets.find(m => {
      const text = (m.question + " " + m.description).toLowerCase();
      return text.includes(teamA.toLowerCase()) && text.includes(teamB.toLowerCase());
    });

    if (!relevantMarket || !relevantMarket.outcomePrices) {
      return null;
    }

    // Outcome prices are typically strings like ["0.65", "0.35"]
    // Index 0 is usually "Yes" / First Team
    const prices = JSON.parse(relevantMarket.outcomePrices);
    return parseFloat(prices[0]);
  } catch (error) {
    console.error('Error fetching Polymarket probability:', error);
    return null;
  }
}
```

- [ ] **Step 4: Update test to mock API response and verify it passes**

```typescript
import { getPolymarketProbability } from './polymarket';
import { fetchJson } from './fetcher';

jest.mock('./fetcher');

describe('getPolymarketProbability', () => {
  it('returns probability when a relevant market is found', async () => {
    (fetchJson as jest.Mock).mockResolvedValue([
      {
        question: 'Will G2 Esports beat Natus Vincere?',
        description: 'G2 vs Navi match',
        outcomePrices: '["0.65", "0.35"]'
      }
    ]);

    const prob = await getPolymarketProbability('G2', 'Navi');
    expect(prob).toBe(0.65);
  });

  it('returns null when no relevant market is found', async () => {
    (fetchJson as jest.Mock).mockResolvedValue([]);
    const prob = await getPolymarketProbability('T1', 'GenG');
    expect(prob).toBeNull();
  });
});
```

- [ ] **Step 5: Run tests and ensure they pass**

Run: `npm test src/utils/polymarket.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/polymarket.ts src/utils/polymarket.test.ts
git commit -m "feat: add polymarket probability utility with tests"
```

---

### Task 2: Update `get_optimal_bet_strategy` to use Polymarket Signal

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Update `get_optimal_bet_strategy` input schema**

Modify `src/analysis.ts` to add `polymarketProbabilityTeamA` to `inputSchema.properties`.

```typescript
// Add to inputSchema
polymarketProbabilityTeamA: { type: "number", description: "Market implied probability from Polymarket (0.0 to 1.0)" }
```

- [ ] **Step 2: Implement Consensus Logic in `get_optimal_bet_strategy` handler**

Modify the implementation of `get_optimal_bet_strategy` in `src/analysis.ts`.

```typescript
// Inside get_optimal_bet_strategy handler
const polymarketProbA = args.polymarketProbabilityTeamA as number | undefined;

// ... after calculating evA, evB, bestTeam, etc ...

let marketValidation = "No Market Data";
if (polymarketProbA !== undefined && bestTeam !== "None") {
  const modelProb = bestTeam === "Team A" ? probA : probB;
  const marketProb = bestTeam === "Team A" ? polymarketProbA : (1 - polymarketProbA);
  
  const evMarket = (modelProb / marketProb) - 1;
  
  if (evMarket > 0) {
    marketValidation = "Confirmed";
    if (recommendation === "Strong Value Bet") {
      recommendation = "Confirmed Strong Value Bet";
    }
  } else {
    marketValidation = "Divergent";
    // If market disagrees significantly, downgrade or warn
    if (Math.abs(evMarket) > 0.15) {
      recommendation = "High Divergence - Exercise Caution";
    }
  }
}

// Update return object
return { 
  content: [{ 
    type: "text", 
    text: JSON.stringify({
      analysis_summary: {
        // ...
        polymarket_implied_prob: polymarketProbA !== undefined ? (polymarketProbA * 100).toFixed(2) + "%" : "N/A"
      },
      optimal_bet: {
        // ...
        market_validation: marketValidation,
        rationale: recommendation
      }
    }, null, 2) 
  }] 
};
```

- [ ] **Step 3: Run existing tests to ensure no regressions**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Manual Verification with test script**

Update `scripts/test-mcp.js` (or create a new one) to test the new parameter.

```javascript
// Example test call
const response = await server.callTool({
  name: "get_optimal_bet_strategy",
  arguments: {
    teamAElo: 1600,
    teamBElo: 1500,
    bookmakerOddsTeamA: 2.1,
    bookmakerOddsTeamB: 1.8,
    bankroll: 1000,
    polymarketProbabilityTeamA: 0.55 // Model thinks 63%, Market thinks 55% -> Confirmed
  }
});
console.log(response);
```

- [ ] **Step 5: Commit**

```bash
git add src/analysis.ts
git commit -m "feat: integrate polymarket signal into optimal bet strategy tool"
```
