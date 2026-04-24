# Esports Data MCP

This MCP server provides standardized data interfaces for competitive esports analytics, enabling seamless integration with betting platforms, statistical models, and live dashboards.

## Mathematical Logic & Bayesian Analysis

The core of our analysis engine uses a hierarchical Bayesian framework to correct for market biases and non-stationary team form.

### 1. Baseline Win Probability (Elo)
We calculate the initial win probability for Team $A$ against Team $B$ using the standard Elo logistics curve:
$$P_{Elo}(A) = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$
where $R_A$ and $R_B$ are the respective Elo ratings.

### 2. Boltzmann Sharpening (Market Prior)
If Elo is unavailable, we derive a prior from bookmaker odds using the Boltzmann distribution to correct for "favorite-longshot bias" (FLB):
$$P_i = \frac{\exp(-E_i / T)}{\sum_j \exp(-E_j / T)}$$
where $E_i$ is the inverse odd (energy level) and $T$ is the "market temperature."
- **Low $T$ (0.8)**: Sharpens favorites (Dota 2 profile).
- **High $T$ (1.2)**: Increases entropy for volatile games (Valorant profile).

### 3. Logistic Action2Score Adjustment
We adjust the win probability based on individual player impact scores, weighted by their specific game roles (e.g., Carry vs. Support):
$$Adjustment = (\sigma(\sum_{i=1}^n Impact_i \cdot W_i) - 0.5) \cdot 0.4$$
where $\sigma$ is the sigmoid function $\frac{1}{1+e^{-x}}$. This bounds the performance adjustment to a $\pm 20\%$ shift.

### 4. Time-Decayed Bayesian Dirichlet Update
Finally, we update our prior belief with historical head-to-head results using a Dirichlet-Multinomial update with a time-decay factor $\lambda$:
$$\alpha_{new} = (\lambda \cdot \alpha_{old}) + x_t$$
where $x_t$ is the result of match $t$ (one-hot encoded for Team A, Team B, or Draw) and $\lambda \in [0.9, 0.99]$ ensures that recent form carries more weight than distant history.

## Available Tools

### Statistical Analysis (Unified Engine)
- `analyze_match_bayesian`: **Unified Bayesian Engine**. Automatically detects game context (Dota 2, CS2, Valorant) and calculates win probabilities, Expected Value (EV), and optimal betting strategy (Quarter-Kelly). Supports market data comparison (Polymarket).

### Title-Specific Data Fetchers
- **Dota 2:** `get_dota2_heroes`, `get_dota2_live_matches`, `search_dota2_teams`, `get_dota2_team_info`, `get_dota2_team_roster`.
- **CS2:** `get_cs2_matches`, `get_cs2_team_info`, `get_cs2_player_stats`.
- **Valorant:** `get_valo_matches`, `get_valo_events`, `get_valo_team_info`.
- **League of Legends:** `get_lol_matches`, `get_lol_team_info`, `get_lol_gol_team_stats`.
- **Others:** Overwatch 2, Marvel Rivals support.

## Getting Started

### MCP Configuration
Add the following snippet to your `mcp.json` or `config.json` (adjusting paths to your local directory):
```json
{
  "mcpServers": {
    "esports-analysis": {
      "command": "node",
      "args": ["C:/Users/user/esports_betting_mcp/dist/analysis.js"],
      "cwd": "C:/Users/user/esports_betting_mcp"
    }
  }
}
```

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/thekogit/esports-data-mcp.git
   cd esports-data-mcp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configuration:
   Create a `.env` file in the project root and add your necessary API tokens.

### Running
- Development: `npm run dev`
- Build: `npm run build`
- Run MCP: `node dist/analysis.js`

