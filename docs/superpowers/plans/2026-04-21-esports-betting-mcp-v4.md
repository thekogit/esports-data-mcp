# Esports Betting MCP Implementation Plan (v4)

**Goal:** Add Marvel Rivals and Overwatch 2 MCP servers to the existing suite.

**Architecture:** Add two new entry points `src/marvel_rivals.ts` and `src/overwatch.ts`. Share utilities for scraping Liquipedia.

---

### Task 1: Update Liquipedia Utility
- [ ] Ensure `getLiquipediaTournaments` and `getLiquipediaRoster` handle `marvelrivals` and `overwatch` slugs correctly.

### Task 2: Implement Marvel Rivals Server
- [ ] **Tools**:
  - `get_rivals_player_stats`: Use `marvelrivalsapi.com` or scrape player profiles.
  - `get_rivals_counters_synergies`: Scrape `peakrivals.com` or similar for current hero data.
  - `get_rivals_tournaments`: Use Liquipedia scraper for `marvelrivals`.
  - `get_rivals_team_info`: Roster and history via Liquipedia.

### Task 3: Implement Overwatch 2 Server
- [ ] **Tools**:
  - `get_ow_player_stats`: Scrape Overbuff or use unofficial APIs.
  - `get_ow_live_matches`: Scrape Liquipedia for upcoming and ongoing OWCS matches.
  - `get_ow_counters_synergies`: Hero counters based on current patch data.
  - `get_ow_tournaments`: All tiers from Liquipedia.
  - `get_ow_team_info`: Roster and history.

### Task 4: Final Integration
- [ ] Update `package.json` build script (though `tsc` in root should handle all `src/*.ts`).
- [ ] Update `mcp-snippet.json`.
- [ ] `npm run build` and verify.
