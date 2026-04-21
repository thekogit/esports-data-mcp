# Esports Betting MCP Implementation Plan (v3)

**Goal:** Ensure every MCP server (LoL, Valo, Dota2, CS2) has separate, dedicated tools for individual player and team statistics, including historical data.

**Architecture:** Add specific tools to each game server for `get_<game>_team_info` and `get_<game>_player_info`.

---

### Task 1: Update CS2 Server
- [ ] Add `get_cs2_team_info` using `HLTV.getTeam`.
- [ ] Add `get_cs2_player_info` using `HLTV.getPlayer`.
- [ ] Add `get_cs2_player_stats` using `HLTV.getPlayerStats`.

### Task 2: Update Dota 2 Server
- [ ] Add `get_dota2_team_info` using OpenDota `/teams/{team_id}`.
- [ ] Add `get_dota2_player_info` using OpenDota `/players/{account_id}`.

### Task 3: Update Valorant Server
- [ ] Add `get_valo_team_info` by scraping `vlr.gg/team/{id}`.
- [ ] Add `get_valo_player_info` by scraping `vlr.gg/player/{id}`.

### Task 4: Update LoL Server
- [ ] Add `get_lol_team_info` (ensure it gets detailed bio/history from Liquipedia).
- [ ] Add `get_lol_player_info` by scraping `liquipedia.net/leagueoflegends/{player_name}`.

### Task 5: Build and Verify
- [ ] `npm run build`
- [ ] Test that all 4 servers compile.
