# Esports Betting MCP Server Design

## Architecture
- **Single Project**: A single `package.json` in `esports_betting_mcp/` containing shared dependencies (e.g., `@modelcontextprotocol/sdk`, `axios`, `cheerio`, `hltv`).
- **Build System**: TypeScript with `tsc`. `npm run build` compiles `src/` to `dist/`, generating 4 entry points: `dist/lol.js`, `dist/valo.js`, `dist/dota2.js`, `dist/cs2.js`.
- **Configuration**: Claude Desktop config `mcp.json` mapping each game to its respective node command.

## Data Sources & Tools per Server

### 🎮 League of Legends (LoL) Server
- **Sources**: Adapted from `opgg-mcp` & `Lol_Data_MCP_Server`, using Riot API/Data Dragon + scraping OP.GG.
- **Tools**:
  - `get_lol_counters_synergies`: Live patch data for champions (via scraping).
  - `get_lol_team_info`: Tier teams and current rosters.
  - `get_lol_player_stats`: Individual historical performance.
  - `get_lol_live_matches`: Current live matches.

### 🎯 Valorant Server
- **Sources**: Adapted from `vlr-stats-mcp`, using `vlr.gg` scraping + Valorant Data Lab API.
- **Tools**:
  - `get_valo_counters_synergies`: Agent duos and counters.
  - `get_valo_team_info`: Tiered esports teams and players.
  - `get_valo_player_stats`: Individual historical data.
  - `get_valo_live_matches`: Ongoing live matches.

### 🛡️ Dota 2 Server
- **Sources**: Adapted from `opendota-mcp-server`, using OpenDota API.
- **Tools**:
  - `get_dota2_counters_synergies`: `/heroes/{id}/matchups` endpoint.
  - `get_dota2_team_info`: Pro team rosters.
  - `get_dota2_player_stats`: Pro player historical data.
  - `get_dota2_live_matches`: Ongoing matches.

### 🔫 Counter-Strike 2 (CS2) Server
- **Sources**: `hltv` npm package.
- **Tools**:
  - `get_cs2_team_map_performance`: Team win rates/stats on chosen maps.
  - `get_cs2_player_map_performance`: Individual player stats on chosen maps.
  - `get_cs2_team_info`: Team tiers and active rosters.
  - `get_cs2_player_stats`: Historical performance.
  - `get_cs2_live_matches`: Live scorebot / match data.
