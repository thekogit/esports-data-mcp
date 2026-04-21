# Esports Betting MCP Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive 4-server MCP suite for Valorant, LoL, Dota 2, and CS2 with "all tier" and "live match" support.

**Architecture:** Monorepo-style project with a Liquipedia scraper utility and 4 game-specific entry points.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `axios`, `cheerio`, `hltv`, `jest`.

---

### Task 1: Enhanced Liquipedia Utility

**Files:**
- Create: `src/utils/liquipedia.ts`
- Test: `src/utils/liquipedia.test.ts`

- [ ] **Step 1: Implement Liquipedia Scraper**
Focus on fetching tournament lists and rosters.
```typescript
import { fetchHtml } from './fetcher';
import * as cheerio from 'cheerio';

export async function getLiquipediaTournaments(game: string) {
  const url = `https://liquipedia.net/${game}/Portal:Tournaments`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const tournaments: any[] = [];
  $('.divTable .divRow').each((i, el) => {
    tournaments.push({
      name: $(el).find('.Tournament').text().trim(),
      dates: $(el).find('.Date').text().trim(),
      tier: $(el).find('.Tier').text().trim(),
    });
  });
  return tournaments;
}
```

- [ ] **Step 2: Add Team Roster Scraping**
```typescript
export async function getLiquipediaRoster(game: string, teamName: string) {
  const url = `https://liquipedia.net/${game}/${teamName}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const players: string[] = [];
  $('.teamcard-inner .player').each((i, el) => {
    players.push($(el).text().trim());
  });
  return players;
}
```

- [ ] **Step 3: Commit**
```bash
git add src/utils/liquipedia.ts
git commit -m "feat: add Liquipedia scraper utility"
```

---

### Task 2: Valorant Server (Priority 1)

**Files:**
- Modify: `src/valo.ts`

- [ ] **Step 1: Add Event and Match Tools**
Update `src/valo.ts` to use `vlr.gg` scraping for all tiers.
```typescript
import { fetchHtml } from './utils/fetcher';
import * as cheerio from 'cheerio';

// ... existing imports ...

// Add to tools list:
// { name: "get_valo_matches", description: "Get live and upcoming matches from vlr.gg" }
// { name: "get_valo_events", description: "List tournaments by tier" }

// Implementation snippet for matches:
async function getVlrMatches() {
  const html = await fetchHtml('https://www.vlr.gg/matches');
  const $ = cheerio.load(html);
  const matches: any[] = [];
  $('.match-item').each((i, el) => {
    matches.push({
      teams: $(el).find('.match-item-vs-team-name').map((i, team) => $(team).text().trim()).get(),
      status: $(el).find('.match-item-eta').text().trim(),
      event: $(el).find('.match-item-event').text().trim(),
    });
  });
  return matches;
}
```

- [ ] **Step 2: Commit**
```bash
git add src/valo.ts
git commit -m "feat: enhance Valorant server with vlr.gg scraping"
```

---

### Task 3: League of Legends Server (Priority 2)

**Files:**
- Modify: `src/lol.ts`

- [ ] **Step 1: Integrate Liquipedia and Live Match Support**
```typescript
import { getLiquipediaTournaments, getLiquipediaRoster } from './utils/liquipedia';

// Add tools:
// get_lol_tournaments
// get_lol_team_info (using roster scraper)

// Implementation snippet:
if (request.params.name === "get_lol_tournaments") {
  const data = await getLiquipediaTournaments('leagueoflegends');
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
```

- [ ] **Step 2: Commit**
```bash
git add src/lol.ts
git commit -m "feat: enhance LoL server with Liquipedia integration"
```

---

### Task 4: Dota 2 Server (Priority 3)

**Files:**
- Modify: `src/dota2.ts`

- [ ] **Step 1: Enhance with Pro Matches and Tiers**
```typescript
// Add tools:
// get_dota2_live_matches (using OpenDota /live)
// get_dota2_leagues (using Liquipedia)

if (request.params.name === "get_dota2_live_matches") {
  const { data } = await axios.get('https://api.opendota.com/api/live');
  return { content: [{ type: "text", text: JSON.stringify(data.slice(0, 10), null, 2) }] };
}
```

- [ ] **Step 2: Commit**
```bash
git add src/dota2.ts
git commit -m "feat: enhance Dota 2 server with live match support"
```

---

### Task 5: CS2 Server (Priority 4)

**Files:**
- Modify: `src/cs2.ts`

- [ ] **Step 1: Expose Full HLTV Capabilities**
Add events, rankings, and map-specific tools.
```typescript
// Add tools:
// get_cs2_events
// get_cs2_team_rankings

if (request.params.name === "get_cs2_team_rankings") {
  const rankings = await HLTV.getTeamRanking();
  return { content: [{ type: "text", text: JSON.stringify(rankings, null, 2) }] };
}
```

- [ ] **Step 2: Commit**
```bash
git add src/cs2.ts
git commit -m "feat: enhance CS2 server with HLTV rankings and events"
```

---

### Task 6: Final Build and Config Update

- [ ] **Step 1: Build all servers**
Run: `npm run build`

- [ ] **Step 2: Update mcp-snippet.json**
Ensure all new tools are reflected in the documentation.

- [ ] **Step 3: Final Commit**
```bash
git add .
git commit -m "feat: complete esports betting MCP suite v2"
```
