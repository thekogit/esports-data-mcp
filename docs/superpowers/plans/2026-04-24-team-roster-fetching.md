# Esports Team Roster Fetching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standardized tool across all game-specific MCP servers to fetch the most up-to-date team rosters, including active players and the head coach.

**Architecture:** Use a Hybrid Data Source approach: CS2 uses HLTV, Dota 2 uses OpenDota + Liquipedia, Valorant uses VLR.gg, and other games use an enhanced Liquipedia scraper.

**Tech Stack:** TypeScript, Cheerio, HLTV API, OpenDota API, Axios.

---

### Task 1: Enhance Liquipedia Roster Utility

**Files:**
- Modify: `src/utils/liquipedia.ts`
- Create: `src/utils/liquipedia.test.ts`

- [ ] **Step 1: Write a failing test for the enhanced roster utility**

```typescript
import { getLiquipediaRoster } from './liquipedia';

describe('getLiquipediaRoster', () => {
  it('should fetch both players and coach from a team page', async () => {
    // This will initially fail or return only players without the new structure
    const roster = await getLiquipediaRoster('dota2', 'Team_Spirit');
    expect(roster).toHaveProperty('players');
    expect(roster).toHaveProperty('coach');
    expect(Array.isArray(roster.players)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/utils/liquipedia.test.ts`
Expected: FAIL (types won't match or coach will be missing)

- [ ] **Step 3: Update `getLiquipediaRoster` implementation**

```typescript
export async function getLiquipediaRoster(game: string, teamName: string) {
  const url = `https://liquipedia.net/${game}/${teamName}`;
  const html = await fetchHtml(url).catch(() => null);
  if (!html) return { players: [], coach: null, lastUpdated: new Date().toISOString() };
  const $ = cheerio.load(html);
  
  const players: any[] = [];
  let coach: string | null = null;

  // 1. Parse Active Roster Table
  $('.teamcard-inner .player, .roster-card .player, .wikitable.roster-table tr').each((i, el) => {
    const name = $(el).text().trim();
    if (name && !players.some(p => p.id === name)) {
      players.push({ id: name });
    }
  });

  // 2. Parse Staff/Coach from infobox or dedicated tables
  $('.infobox-cell-2:contains("Coach"), .infobox-cell-2:contains("Head Coach")').each((i, el) => {
    const nextCell = $(el).next('.infobox-cell-2');
    if (nextCell.length) {
      coach = nextCell.text().trim();
    }
  });
  
  // Fallback for coach in staff tables
  if (!coach) {
    $('.wikitable.staff-table tr, .wikitable tr').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Coach') || text.includes('Head Coach')) {
        coach = $(el).find('td').last().text().trim();
      }
    });
  }

  return {
    players,
    coach,
    lastUpdated: new Date().toISOString()
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/utils/liquipedia.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/utils/liquipedia.ts src/utils/liquipedia.test.ts
git commit -m "feat: enhance liquipedia roster utility to include coaches"
```

### Task 2: Update CS2 MCP Server

**Files:**
- Modify: `src/cs2.ts`

- [ ] **Step 1: Update `get_cs2_team_info` tool response**

```typescript
  if (request.params.name === "get_cs2_team_info") {
    const teamId = args.teamId as number;
    const teamInfo = await getCachedData(`team_${teamId}`, () => HLTV.getTeam({ id: teamId }));
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          name: teamInfo.name,
          players: teamInfo.players.map(p => ({ id: p.name, name: p.fullname })),
          coach: teamInfo.coach ? teamInfo.coach.name : null,
          rank: teamInfo.rank,
          recentResults: teamInfo.recentResults
        }, null, 2) 
      }] 
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/cs2.ts
git commit -m "feat(cs2): explicitly include coach in team info"
```

### Task 3: Update Dota 2 MCP Server

**Files:**
- Modify: `src/dota2.ts`

- [ ] **Step 1: Add `get_dota2_team_roster` tool definition**

```typescript
      {
        name: "get_dota2_team_roster",
        description: "Get the current team roster including players and coach. Uses team name.",
        inputSchema: {
          type: "object",
          properties: {
            teamName: { type: "string", description: "Team name (e.g. 'Team Spirit')" }
          },
          required: ["teamName"]
        }
      }
```

- [ ] **Step 2: Implement the tool logic**

```typescript
  if (request.params.name === "get_dota2_team_roster") {
    const teamName = args.teamName as string;
    const roster = await getLiquipediaRoster('dota2', teamName.replace(/ /g, '_'));
    return { content: [{ type: "text", text: JSON.stringify(roster, null, 2) }] };
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/dota2.ts
git commit -m "feat(dota2): add team roster tool with coach support"
```

### Task 4: Update Valorant MCP Server

**Files:**
- Modify: `src/valo.ts`

- [ ] **Step 1: Update `get_valo_team_info` to include coach**

```typescript
  if (request.params.name === "get_valo_team_info") {
    const html = await fetchHtml(`https://www.vlr.gg/team/${args.teamId}`);
    const $ = cheerio.load(html);
    
    const players = $('.team-roster-item').map((i, el) => ({
      player: $(el).find('.team-roster-item-name-alias').text().trim(),
      realName: $(el).find('.team-roster-item-name-real').text().trim(),
    })).get();

    // Find coach in the staff section
    let coach: string | null = null;
    $('.team-staff-item').each((i, el) => {
      const role = $(el).find('.team-staff-item-role').text().trim().toLowerCase();
      if (role.includes('coach')) {
        coach = $(el).find('.team-staff-item-name-alias').text().trim();
      }
    });

    const team: any = {
      name: $('.team-header-name h1').text().trim(),
      roster: players,
      coach: coach
    };
    return { content: [{ type: "text", text: JSON.stringify(team, null, 2) }] };
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/valo.ts
git commit -m "feat(valo): include coach in team info from vlr.gg"
```

### Task 5: Standardize LoL, OW, and Marvel Rivals

**Files:**
- Modify: `src/lol.ts`, `src/overwatch.ts`, `src/marvel_rivals.ts`

- [ ] **Step 1: Update `get_lol_team_info` to use new roster structure**

```typescript
  if (request.params.name === "get_lol_team_info") {
    const team = args.teamName as string;
    const roster = await getLiquipediaRoster('leagueoflegends', team.replace(/ /g, '_'));
    return { content: [{ type: "text", text: JSON.stringify(roster, null, 2) }] };
  }
```

- [ ] **Step 2: Update `get_ow_team_info`**

```typescript
  if (request.params.name === "get_ow_team_info") {
    const roster = await getLiquipediaRoster('overwatch', (args.teamName as string).replace(/ /g, '_'));
    return { content: [{ type: "text", text: JSON.stringify(roster, null, 2) }] };
  }
```

- [ ] **Step 3: Update `get_rivals_team_info`**

```typescript
  if (request.params.name === "get_rivals_team_info") {
    const roster = await getLiquipediaRoster('marvelrivals', (args.teamName as string).replace(/ /g, '_'));
    return { content: [{ type: "text", text: JSON.stringify(roster, null, 2) }] };
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/lol.ts src/overwatch.ts src/marvel_rivals.ts
git commit -m "feat: standardize team info tools to use enhanced roster utility"
```

### Task 6: Documentation Update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README.md with new tool capabilities**

- [ ] **Step 2: Commit and Push**

```bash
git add README.md
git commit -m "docs: update README with team roster and coach features"
git push origin main
```
