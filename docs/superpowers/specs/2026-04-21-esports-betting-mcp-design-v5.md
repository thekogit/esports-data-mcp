# Esports Betting MCP Server Design (v5)

## Overview
A comprehensive suite of 6 MCP servers providing data for Valorant, LoL, Dota 2, CS2, Overwatch, and Marvel Rivals. This version introduces explicit betting-focused features (odds, win probability) and robust performance optimizations (caching, payload limits).

## Architecture
- **Single Project**: Shared `package.json` and `tsconfig.json`.
- **Shared Utils**: `src/utils/fetcher.ts` (with caching) and `src/utils/liquipedia.ts`.
- **Build System**: `npm run build` compiles `src/*.ts` to `dist/*.js`.

## Data Strategy
- **Caching Layer**: All external requests are cached for 5 minutes (TTL) using a simple in-memory store in `fetcher.ts`.
- **Payload Truncation**: All list-based tools (rankings, matchups, events) are limited to the top 20-30 results to maintain LLM context efficiency.
- **Betting Odds**: Integration of simulated or scraped odds where official APIs are unavailable, and real-time odds for games with public data.

## Tool Definitions

### 🎯 Valorant Server (`valo.ts`)
- `get_valo_events(status, tier)`: List tournaments.
- `get_valo_matches()`: Live/Upcoming matches with *win probabilities*.
- `get_valo_team_info(teamId)`: Roster, recent form, and rankings.
- `get_valo_player_stats(playerId)`: Performance metrics.
- `get_valo_agent_stats(agentName)`: Win rates, counters, and synergies.
- `get_valo_odds(matchId)`: [NEW] Current match betting lines.

### 🎮 League of Legends Server (`lol.ts`)
- `get_lol_tournaments()`: Pro and semi-pro circuit data.
- `get_lol_matches()`: [NEW] Schedule, live scores, and *odds*.
- `get_lol_team_info(teamName)`: Roster and tier performance.
- `get_lol_player_stats(playerName)`: Historical performance.
- `get_lol_counters(championName)`: Scraped live patch data from OP.GG.

### 🛡️ Dota 2 Server (`dota2.ts`)
- `get_dota2_leagues(tier)`: List leagues and tournaments.
- `get_dota2_live_matches()`: Real-time scores and in-game stats.
- `get_dota2_team_info(teamId)`: Historical performance and roster.
- `get_dota2_player_stats(accountId)`: Historical W/L and hero stats.
- `get_dota2_hero_stats(heroId)`: Counters and synergies via OpenDota (limited to top 15).
- `get_dota2_odds(matchId)`: [NEW] Match betting markets.

### 🔫 Counter-Strike 2 Server (`cs2.ts`)
- `get_cs2_events()`: List all HLTV events.
- `get_cs2_matches()`: Live scorebot and upcoming matches with *odds*.
- `get_cs2_team_rankings()`: Global rankings (limited to top 20).
- `get_cs2_map_performance(teamId, mapName)`: Team stats on specific maps.
- `get_cs2_player_stats(playerId)`: Historical performance metrics.
- `get_cs2_player_map_performance(playerId, mapName)`: [NEW] Player stats on specific maps.

### 🦸 Overwatch Server (`overwatch.ts`)
- `get_ow_tournaments()`: List OWCS and major events.
- `get_ow_live_matches()`: Schedule and scores.
- `get_ow_player_stats(battletag)`: Overbuff scrape.
- `get_ow_team_info(teamName)`: Liquipedia roster/info.

### 💥 Marvel Rivals Server (`marvel_rivals.ts`)
- `get_rivals_tournaments()`: List tournaments.
- `get_rivals_player_stats(username)`: Historical performance.
- `get_rivals_counters_synergies()`: Current meta data.
- `get_rivals_team_info(teamName)`: Liquipedia roster/info.

## Verification Plan
1. **Unit Tests**: Update `src/utils/fetcher.test.ts` to verify caching logic.
2. **Integration Tests**: New script `scripts/verify-betting-tools.js` to call every new endpoint and verify non-empty JSON structure.
3. **Context Check**: Verify that `get_cs2_team_rankings` and `get_dota2_hero_stats` return < 50 items.
