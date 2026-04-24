# Unified Bayesian Esports Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a unified `analyze_match_bayesian` tool that automatically detects game context and applies tuned Bayesian Dirichlet-Boltzmann logic.

**Architecture:** Use a Structural Heuristic engine to identify the game from player roles/positions, then apply game-specific temperature ($T$) and decay ($\lambda$) parameters to a unified Bayesian engine.

**Tech Stack:** TypeScript, MCP SDK, Bayesian Math (Dirichlet/Boltzmann).

---

### Task 1: Implement Game Detection Heuristics

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Define GameContext types and identification constants**

```typescript
type GameContext = 'dota2' | 'cs2' | 'valo' | 'generic';

interface GameParameters {
  lambda: number; // Time decay
  temperature: number; // Boltzmann sharpening
  posWeights: Record<string | number, number>;
  biasCorrection: 'standard' | 'reverse' | 'none';
}

const GAME_PROFILES: Record<GameContext, GameParameters> = {
  dota2: { lambda: 0.96, temperature: 0.8, posWeights: { 1: 1.2, 2: 1.1, 3: 1.0, 4: 0.8, 5: 0.8 }, biasCorrection: 'reverse' },
  cs2: { lambda: 0.98, temperature: 1.1, posWeights: { 'IGL': 1.1, 'Entry': 1.1, 'AWPer': 1.05 }, biasCorrection: 'standard' },
  valo: { lambda: 0.92, temperature: 1.2, posWeights: { 'Duelist': 1.15, 'Initiator': 1.1, 'Controller': 1.0, 'Sentinel': 1.0 }, biasCorrection: 'none' },
  generic: { lambda: 0.95, temperature: 1.0, posWeights: {}, biasCorrection: 'none' }
};
```

- [ ] **Step 2: Implement `identifyGameContext` helper**

```typescript
function identifyGameContext(playerImpacts: any[]): GameContext {
  if (!playerImpacts || playerImpacts.length === 0) return 'generic';
  
  const sample = playerImpacts[0];
  if (typeof sample.position === 'number' && [1, 2, 3, 4, 5].includes(sample.position)) return 'dota2';
  
  const roles = playerImpacts.map(p => (p.role || '').toLowerCase());
  if (roles.some(r => ['duelist', 'initiator', 'sentinel', 'controller'].includes(r))) return 'valo';
  if (roles.some(r => ['igl', 'awper', 'entry', 'lurker'].includes(r))) return 'cs2';
  if (roles.some(r => ['carry', 'mid', 'jungler', 'support'].includes(r))) return 'dota2';
  
  return 'generic';
}
```

- [ ] **Step 3: Commit**

```bash
git add src/analysis.ts
git commit -m "feat(analysis): add game detection heuristics"
```

---

### Task 2: Implement Unified Bayesian Engine

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Implement `calculate_match_probabilities` internal logic**

```typescript
function calculateMatchProbabilities(
  context: GameContext,
  odds: { home: number; away: number; draw?: number },
  playerImpacts: any[],
  history: any[]
) {
  const profile = GAME_PROFILES[context];
  
  // 1. Boltzmann Prior
  const eH = odds.home / odds.away;
  const eA = odds.away / odds.home;
  const eD = odds.draw;

  const pH_un = Math.exp(-eH / profile.temperature);
  const pA_un = Math.exp(-eA / profile.temperature);
  const pD_un = eD !== undefined ? Math.exp(-eD / profile.temperature) : 0;
  const Z = pH_un + pA_un + pD_un;
  
  const prior = { home: pH_un / Z, away: pA_un / Z, draw: pD_un / Z };

  // 2. Time-Decayed Dirichlet Update
  let homeWins = 0, awayWins = 0, draws = 0;
  history.forEach(match => {
    const daysAgo = (Date.now() - new Date(match.date).getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.pow(profile.lambda, Math.max(0, daysAgo));
    
    if (match.winner === 'home') homeWins += weight;
    else if (match.winner === 'away') awayWins += weight;
    else draws += weight;
  });

  const S = Math.round(homeWins + awayWins + draws) || 10; // Default strength
  const alphaH = prior.home * S;
  const alphaA = prior.away * S;
  const alphaD = prior.draw * S;

  const postH = (homeWins + alphaH) / (S + homeWins + awayWins + draws);
  const postA = (awayWins + alphaA) / (S + homeWins + awayWins + draws);
  const postD = (draws + alphaD) / (S + homeWins + awayWins + draws);

  return { home: postH, away: postA, draw: postD };
}
```

- [ ] **Step 2: Add `analyze_match_bayesian` to MCP tool list**

- [ ] **Step 3: Commit**

```bash
git add src/analysis.ts
git commit -m "feat(analysis): implement unified bayesian tool"
```

---

### Task 3: Final Integration and README update

**Files:**
- Modify: `src/analysis.ts`, `README.md`

- [ ] **Step 1: Register `analyze_match_bayesian` tool handler**
- [ ] **Step 2: Update README with the new tool and mathematical description**
- [ ] **Step 3: Commit and Push**

```bash
git add src/analysis.ts README.md
git commit -m "docs: update README and finalize unified analysis tool"
git push origin main
```
