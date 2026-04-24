# Design Doc: Unified Bayesian Esports Analysis (Structural Heuristic)

**Date:** 2026-04-24
**Status:** In Review
**Topic:** Consolidating game-specific analysis into a single, intelligent Bayesian tool.

## 1. Objective
Replace fragmented analysis tools with a single `analyze_match_bayesian` tool that automatically identifies the game context (Dota 2, CS2, Valorant, etc.) and applies tuned mathematical constants for win probability estimation.

## 2. Structural Heuristic Detection
The tool will inspect the `playerImpacts` array and `context` strings to identify the game.

| Signal | Identifier | Target Game |
| :--- | :--- | :--- |
| **Position 1-5** | Numeric keys 1, 2, 3, 4, 5 | Dota 2 |
| **MOBA Roles** | "Carry", "Support", "Mid", "Jungler" | LoL / Dota 2 |
| **Tactical Roles** | "Duelist", "Initiator", "Sentinel", "Controller" | Valorant |
| **CS2 Roles** | "IGL", "Entry", "AWPer", "Lurker" | CS2 |
| **Keywords** | "Roshan", "Spike", "HLTV", "Nexus" | Game Specific |

## 3. Mathematical Engine

### 3.1. Boltzmann Sharpening with Temperature ($T$)
Corrects for market bias using:
$P_i = \frac{\exp(-E_i / T)}{Z}$
- **Lower $T$ (0.8)**: Sharpens favorites (Dota 2).
- **Higher $T$ (1.2)**: Increases entropy for high-volatility games (Valorant).

### 3.2. Time-Decayed Bayesian Dirichlet
Updates priors while fading old evidence:
$\alpha_{new} = (\lambda \cdot \alpha_{old}) + x$
- **Decay ($\lambda$)**: Set per game (e.g., 0.92 for Valo, 0.98 for CS2).
- **History Weighting**: Recent matches in `historicalResults` are weighted by $\lambda^{(days\_ago)}$ before being added to the pseudo-counts.

### 3.3. Logistic Action2Score
Adjusts Elo-based win probability ($P_{elo}$) using weighted player impacts:
$Adjustment = \sigma(\sum (Impact_i \cdot Weight_{pos(i)})) - 0.5$
$P_{fair} = P_{elo} + Adjustment$

## 4. Tool Specification: `analyze_match_bayesian`

### Inputs
- `teamA`, `teamB`: Names.
- `odds`: `{ home, away, draw? }`
- `playerImpacts`: Array of player performance metrics.
- `historicalResults`: Array of past head-to-head or recent results.
- `marketData`: Optional Polymarket/Exchange data.

### Outputs
- `game_context`: The detected game.
- `probabilities`: Fair win % for each outcome.
- `ev_analysis`: Expected Value vs bookmaker.
- `betting_strategy`: Kelly-calculated wager and risk warning.

## 5. Implementation Plan
1.  **Consolidation**: Merge logic from `calculate_boltzmann_probs` and `calculate_bayesian_dirichlet` into the new unified tool.
2.  **Heuristic Logic**: Implement the `identifyGameContext` helper in `src/analysis.ts`.
3.  **Refactor**: Update `get_optimal_bet_strategy` to serve as a wrapper or be replaced by the unified Bayesian tool.
4.  **Verification**: Add tests for auto-detection accuracy.
