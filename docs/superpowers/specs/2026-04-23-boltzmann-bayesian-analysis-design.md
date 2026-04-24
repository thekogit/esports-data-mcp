# Design Doc: Boltzmann & Bayesian Dirichlet Betting Analysis

**Date:** 2026-04-23
**Status:** Approved
**Topic:** Implementing advanced sharpening and posterior probability updates for betting models.

## 1. Objective
Refine the `analysis-mcp` server by implementing two peer-reviewed methodologies:
1.  **Boltzmann-Informed Probabilities**: Corrects for favorite-longshot bias by sharpening market odds.
2.  **Bayesian Dirichlet Updates**: Incorporates historical evidence into market priors to produce a robust posterior probability.
3.  **Action2Score Refinement**: Implements a position-weighted impact sum for more accurate win probability adjustments.

## 2. Technical Specification

### 2.1. Boltzmann Sharpening
- **Concept**: Market odds $O_i$ are treated as inverse energy levels.
- **Formula**:
    - $E_H = O_H / O_A$ (Relative energy for Home)
    - $E_A = O_A / O_H$ (Relative energy for Away)
    - $E_D = O_D$ (Raw odd for Draw)
- **Probability**: $P_i = \exp(-E_i) / Z$, where $Z = \sum \exp(-E_i)$.

### 2.2. Bayesian Dirichlet Update
- **Concept**: Updates the Boltzmann "Prior" ($p_i$) with observed match history.
- **Formula**:
    - Prior Strength $S = \text{round}(\sum \text{Historical Observations})$
    - $\alpha_i = p_i \cdot S$
    - $P_{posterior, i} = \frac{Count_i + \alpha_i}{\sum Count + \sum \alpha}$
    - Where $Count_i$ is the historical win/draw/loss count for outcome $i$.

### 2.3. Action2Score (GRU-SLP Style Weighted Sum)
- **Concept**: Not all player actions are equal. Carry/Mid impact (Pos 1, 2) has higher correlation with win probability than Support impact.
- **Weighting**:
    - Pos 1 (Carry): 1.2x
    - Pos 2 (Mid): 1.1x
    - Pos 3 (Offlane): 1.0x
    - Pos 4/5 (Support): 0.8x
- **Formula**: $Adjustment = \sum (Impact_i \cdot Weight_{pos(i)})$.

## 3. Tool Definitions (`src/analysis.ts`)

### `calculate_boltzmann_probs`
- **Input**: `oddsHome` (num), `oddsAway` (num), `oddsDraw` (num, optional)
- **Output**: Sharpened probabilities for each outcome.

### `calculate_bayesian_dirichlet`
- **Input**:
    - `boltzmannProbs`: `{ home, away, draw? }`
    - `historicalCounts`: `{ homeWins, awayWins, draws? }`
- **Output**: Posterior probabilities incorporating historical evidence.

## 4. CS2 Odds Integrity
- **Change**: Remove `Math.random()` fallback in `src/cs2.ts`.
- **Behavior**: If HLTV provides no odds, the `odds` field will be `null`.
- **Protocol**: The agent is instructed to use `google_web_search` to find live odds if `get_cs2_matches` returns `null`.

## 5. Implementation Roadmap
1.  Update `src/analysis.ts` with new math tools.
2.  Refine `get_optimal_bet_strategy` logic to use weighted Action2Score.
3.  Modify `src/cs2.ts` to remove simulated data.
4.  Verify with new test cases in `scripts/verify-analysis.js`.
