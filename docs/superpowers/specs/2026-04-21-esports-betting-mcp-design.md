# Esports Betting MCP Server Design (v2)

## Overview
A comprehensive suite of 4 MCP servers providing data for Valorant, LoL, Dota 2, and CS2. Focuses on all tournament tiers (Tier 1 to Amateur), live match data, and deep historical player/team stats.

## Architecture
- **Single Project**: Shared `package.json` and `tsconfig.json`.
- **Build System**: `npm run build` compiles `src/*.ts` to `dist/*.js`.
- **Claude Config**: 4 separate entries pointing to `dist/valo.js`, `dist/lol.js`, `dist/dota2.js`, and `dist/cs2.js`.

## Data Strategy
- **Liquipedia Scraper**: Shared utility to fetch tournaments, rosters, and schedules across all games/tiers.
- **Game-Specific Wrappers**:
  - **Valorant**: `vlr.gg` scraping + Valorant Data Lab API.
  - **LoL**: OP.GG scraping (counters) + Liquipedia (pro/semi-pro info).
  - **Dota 2**: OpenDota API (all matches) + Liquipedia.
  - **CS2**: `hltv` package (all HLTV-tracked matches/rankings).

## Tool Definitions

### 🎯 Valorant Server
- `get_valo_events(status: 'upcoming'|'ongoing'|'completed', tier?: string)`: List tournaments.
- `get_valo_matches()`: Live and upcoming match schedule.
- `get_valo_team_info(teamId: string)`: Roster, recent results, and rankings.
- `get_valo_player_stats(playerId: string)`: Historical performance metrics.
- `get_valo_agent_stats(agentName?: string)`: Win rates, counters, and synergies.

### 🎮 League of Legends Server
- `get_lol_tournaments(region?: string)`: Pro and semi-pro circuit data.
- `get_lol_matches()`: Schedule and live scores.
- `get_lol_team_info(teamName: string)`: Roster and tier performance.
- `get_lol_player_stats(playerName: string)`: Historical performance.
- `get_lol_counters_synergies(championName: string)`: Scraped live patch data from OP.GG.

### 🛡️ Dota 2 Server
- `get_dota2_leagues(tier?: number)`: List leagues and tournaments.
- `get_dota2_live_matches()`: Real-time scores and in-game stats.
- `get_dota2_team_info(teamId: number)`: Historical performance and roster.
- `get_dota2_player_stats(accountId: number)`: Historical W/L and hero stats.
- `get_dota2_hero_stats(heroId: number)`: Counters and synergies via OpenDota.

### 🔫 Counter-Strike 2 Server
- `get_cs2_events()`: List all HLTV events.
- `get_cs2_matches()`: Live scorebot and upcoming matches.
- `get_cs2_team_rankings()`: Global and regional rankings.
- `get_cs2_map_performance(teamId: number, mapName: string)`: Stats on specific maps.
- `get_cs2_player_map_performance(playerId: number, mapName: string)`: Player performance on specific maps.
