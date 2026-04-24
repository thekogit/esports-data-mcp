# Boltzmann & Bayesian Betting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Boltzmann sharpening, Bayesian Dirichlet updates, and Action2Score refinement in the analysis MCP, while removing simulated odds from the CS2 MCP.

**Architecture:** Add two standalone mathematical tools to `src/analysis.ts` and refactor existing betting strategy logic. Remove random data generation from `src/cs2.ts`.

**Tech Stack:** TypeScript, Node.js, Jest.

---

### Task 1: Boltzmann Sharpening Tool

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Add `calculate_boltzmann_probs` tool definition**
- [ ] **Step 2: Implement the Boltzmann logic**
```typescript
if (request.params.name === "calculate_boltzmann_probs") {
  const oH = args.oddsHome as number;
  const oA = args.oddsAway as number;
  const oD = args.oddsDraw as number | undefined;

  const eH = oH / oA;
  const eA = oA / oH;
  const eD = oD; // Draw is raw odd

  const pH_un = Math.exp(-eH);
  const pA_un = Math.exp(-eA);
  const pD_un = eD ? Math.exp(-eD) : 0;
  const z = pH_un + pA_un + pD_un;

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        home_prob: (pH_un / z).toFixed(4),
        away_prob: (pA_un / z).toFixed(4),
        draw_prob: eD ? (pD_un / z).toFixed(4) : "0.0000"
      }, null, 2)
    }]
  };
}
```
- [ ] **Step 3: Commit**

---

### Task 2: Bayesian Dirichlet Update Tool

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Add `calculate_bayesian_dirichlet` tool definition**
- [ ] **Step 2: Implement Bayesian Dirichlet logic**
```typescript
if (request.params.name === "calculate_bayesian_dirichlet") {
  const p = args.boltzmannProbs as { home: number, away: number, draw?: number };
  const c = args.historicalCounts as { homeWins: number, awayWins: number, draws?: number };

  const s = Math.round(c.homeWins + c.awayWins + (c.draws || 0));
  const alphaH = p.home * s;
  const alphaA = p.away * s;
  const alphaD = (p.draw || 0) * s;

  const totalAlpha = alphaH + alphaA + alphaD;
  const totalCount = c.homeWins + c.awayWins + (c.draws || 0);

  const postH = (c.homeWins + alphaH) / (totalCount + totalAlpha);
  const postA = (c.awayWins + alphaA) / (totalCount + totalAlpha);
  const postD = ((c.draws || 0) + alphaD) / (totalCount + totalAlpha);

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        posterior_home: postH.toFixed(4),
        posterior_away: postA.toFixed(4),
        posterior_draw: postD.toFixed(4),
        prior_strength: s
      }, null, 2)
    }]
  };
}
```
- [ ] **Step 3: Commit**

---

### Task 3: Action2Score Position-Weighted Sum

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Update `get_optimal_bet_strategy` schema to accept player impacts**
```typescript
// Add to inputSchema properties
playerImpacts: { 
  type: "array", 
  items: { 
    type: "object", 
    properties: { 
      impact: { type: "number" }, 
      position: { type: "number", enum: [1, 2, 3, 4, 5] } 
    } 
  } 
}
```
- [ ] **Step 2: Implement weighted impact calculation**
```typescript
const weights: Record<number, number> = { 1: 1.2, 2: 1.1, 3: 1.0, 4: 0.8, 5: 0.8 };
let totalImpactAdj = 0;
if (args.playerImpacts) {
  totalImpactAdj = (args.playerImpacts as any[]).reduce((sum, p) => 
    sum + (p.impact * (weights[p.position] || 1.0)), 0);
}
// Adjust probA using totalImpactAdj (scaled by 0.05 per unit)
probA += (totalImpactAdj * 0.05);
```
- [ ] **Step 3: Commit**

---

### Task 4: Fix CS2 OddsHallucinations

**Files:**
- Modify: `src/cs2.ts`

- [ ] **Step 1: Remove random odds generation**
```typescript
// Remove Math.random block
const matchesWithOdds = rawMatches.map((m: any) => ({
  ...m,
  odds: m.odds || null
}));
```
- [ ] **Step 2: Update tool description to guide agent**
```typescript
description: "Get live scorebot and upcoming matches. Note: If odds are null, fetch them via web-search."
```
- [ ] **Step 3: Commit**

---

### Task 5: Build and Final Verification

- [ ] **Step 1: Build project**
- [ ] **Step 2: Update `scripts/verify-analysis.js` to test new tools**
- [ ] **Step 3: Run verification and verify all pass**
- [ ] **Step 4: Final Commit**
