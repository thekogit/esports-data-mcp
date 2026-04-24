# Finalize Task 3 and Spec Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize Bayesian analysis tool with EV and betting strategy, add market data input, re-normalize probabilities, and refactor the legacy betting strategy tool.

**Architecture:** Update `calculateMatchProbabilities` for re-normalization. Enhance `analyze_match_bayesian` with market data and strategy output. Refactor `get_optimal_bet_strategy` to delegate to the Bayesian engine.

**Tech Stack:** TypeScript, MCP SDK

---

### Task 1: Re-normalize Probabilities in calculateMatchProbabilities

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Apply re-normalization after Action2Score adjustment**

```typescript
// In src/analysis.ts, calculateMatchProbabilities function:
  // ... after prior.away = Math.max(0.01, Math.min(0.99, prior.away - adjustment));
  
  // Re-normalize probabilities (home + away + draw = 1.0) after adjustment
  const sumAdj = prior.home + prior.away + prior.draw;
  prior.home /= sumAdj;
  prior.away /= sumAdj;
  prior.draw /= sumAdj;
```

- [ ] **Step 2: Commit changes**

```bash
git add src/analysis.ts
git commit -m "fix: re-normalize probabilities after Action2Score adjustment"
```

---

### Task 2: Enhance analyze_match_bayesian Tool

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Update inputSchema for analyze_match_bayesian**

Add `marketData` property:
```typescript
            marketData: {
              type: "object",
              properties: {
                polymarketProb: { type: "number", description: "Polymarket implied probability (0.0 to 1.0)" },
                exchangeOdds: { type: "number", description: "Exchange decimal odds" }
              }
            },
```

- [ ] **Step 2: Update handler for analyze_match_bayesian**

Calculate EV and Betting Strategy.
```typescript
  if (request.params.name === "analyze_match_bayesian") {
    const odds = args.odds as { home: number; away: number; draw?: number };
    const playerImpacts = args.playerImpacts as PlayerImpact[];
    const historicalResults = args.historicalResults as any[];
    const contextStr = args.context as string | undefined;
    const marketData = args.marketData as { polymarketProb?: number; exchangeOdds?: number } | undefined;
    const bankroll = (args.bankroll as number) || 1000;

    const context = identifyGameContext(playerImpacts, contextStr);
    const result = calculateMatchProbabilities(context, odds, playerImpacts, historicalResults);

    // EV Analysis
    const evHome = (result.home * odds.home) - 1;
    const evAway = (result.away * odds.away) - 1;
    const evDraw = odds.draw ? (result.draw * odds.draw) - 1 : -1;

    // Betting Strategy (Quarter-Kelly)
    let bestOutcome: 'home' | 'away' | 'draw' = 'home';
    let maxEV = evHome;
    if (evAway > maxEV) { bestOutcome = 'away'; maxEV = evAway; }
    if (evDraw > maxEV) { bestOutcome = 'draw'; maxEV = evDraw; }

    let recommendation = "Skip";
    let wager = 0;
    
    if (maxEV > 0) {
      const p = bestOutcome === 'home' ? result.home : (bestOutcome === 'away' ? result.away : result.draw);
      const o = bestOutcome === 'home' ? odds.home : (bestOutcome === 'away' ? odds.away : odds.draw!);
      const b = o - 1;
      const q = 1 - p;
      const kelly = (p * b - q) / b;
      wager = Math.max(0, bankroll * kelly * 0.25);
      recommendation = `Bet on ${bestOutcome}`;
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          game_context: context,
          probabilities: {
            home: (result.home * 100).toFixed(2) + "%",
            away: (result.away * 100).toFixed(2) + "%",
            draw: (result.draw * 100).toFixed(2) + "%"
          },
          ev_analysis: {
            home: evHome.toFixed(4),
            away: evAway.toFixed(4),
            draw: odds.draw ? evDraw.toFixed(4) : "N/A"
          },
          betting_strategy: {
            recommendation,
            optimal_wager: wager.toFixed(2),
            kelly_fraction: "0.25 (Quarter-Kelly)"
          },
          market_comparison: marketData ? {
            polymarket_diff: marketData.polymarketProb ? (result.home - marketData.polymarketProb).toFixed(4) : "N/A",
            exchange_ev: marketData.exchangeOdds ? (result.home * marketData.exchangeOdds - 1).toFixed(4) : "N/A"
          } : "No market data provided"
        }, null, 2)
      }]
    };
  }
```

- [ ] **Step 3: Commit changes**

```bash
git add src/analysis.ts
git commit -m "feat: enhance analyze_match_bayesian with EV and betting strategy"
```

---

### Task 3: Refactor get_optimal_bet_strategy

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Update get_optimal_bet_strategy to use calculateMatchProbabilities**

```typescript
  if (request.params.name === "get_optimal_bet_strategy") {
    // ... extract args ...
    
    // Adapt legacy args to new engine
    const context = identifyGameContext(args.playerImpacts || [], "generic");
    const result = calculateMatchProbabilities(
      context, 
      { home: args.bookmakerOddsTeamA, away: args.bookmakerOddsTeamB },
      args.playerImpacts || [],
      [] // No history available in this legacy tool
    );

    // Reuse the enhanced logic from Task 2 or keep legacy structure but with new probs
    // (User requested refactor to use calculateMatchProbabilities)
    // ...
  }
```

- [ ] **Step 2: Commit changes**

```bash
git commit -am "refactor: use calculateMatchProbabilities in get_optimal_bet_strategy"
```

---

### Task 4: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update tool documentation**

Update `analyze_match_bayesian` section with new input/output fields.

- [ ] **Step 2: Commit changes**

```bash
git commit -am "docs: update README with new Bayesian tool details"
```
