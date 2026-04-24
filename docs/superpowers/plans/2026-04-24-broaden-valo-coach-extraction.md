# Broaden Coach Extraction in Valorant MCP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Broaden coach extraction logic in `src/valo.ts` to check both the main roster and the staff section, and ensure the `players` array only contains players.

**Architecture:** 
- Iterate through `.team-roster-item`.
- For each item, check `.team-roster-item-name-role`.
- If it includes "coach", assign to `coach` variable and EXCLUDE from `players` list.
- If no coach found in roster, check `.team-staff-item`.
- Return updated team info.

**Tech Stack:** TypeScript, Cheerio

---

### Task 1: Create reproduction test

**Files:**
- Create: `src/utils/valo_coach.test.ts`
- Modify: `src/valo.ts` (to export `get_valo_team_info` logic for testing if possible, or just test the tool)

- [ ] **Step 1: Create a test that uses local HTML files to verify coach extraction**

```typescript
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Mocking the extraction logic for now to prove failure
function extractTeamInfo(html: string) {
  const $ = cheerio.load(html);
  
  // Current implementation (simplified)
  const players = $('.team-roster-item').map((i, el) => ({
    player: $(el).find('.team-roster-item-name-alias').text().trim(),
    realName: $(el).find('.team-roster-item-name-real').text().trim(),
  })).get();

  let coach: string | null = null;
  $('.team-staff-item').each((i, el) => {
    const role = $(el).find('.team-staff-item-role').text().trim().toLowerCase();
    if (role.includes('coach')) {
      coach = $(el).find('.team-staff-item-name-alias').text().trim();
    }
  });

  return { name: $('.team-header-name h1').text().trim(), roster: players, coach };
}

describe('Valorant coach extraction', () => {
  it('should extract coach from roster in sentinels.html', () => {
    const html = fs.readFileSync(path.join(__dirname, '../../sentinels.html'), 'utf-8');
    const info = extractTeamInfo(html);
    expect(info.coach).toBeDefined();
    expect(info.coach?.toLowerCase()).toContain('kaplan'); // Sentinels coach is Kaplan
    // Ensure coach is NOT in players list
    const playerNames = info.roster.map(p => p.player.toLowerCase());
    expect(playerNames).not.toContain('kaplan');
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm test src/utils/valo_coach.test.ts`
Expected: FAIL (coach will be null, and Kaplan might be in players)

### Task 2: Implement broadened coach extraction

**Files:**
- Modify: `src/valo.ts`

- [ ] **Step 1: Update `get_valo_team_info` logic**

```typescript
<<<<
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
====
    const players: any[] = [];
    let coach: string | null = null;

    $('.team-roster-item').each((i, el) => {
      const role = $(el).find('.team-roster-item-name-role').text().trim().toLowerCase();
      const alias = $(el).find('.team-roster-item-name-alias').text().trim();
      const realName = $(el).find('.team-roster-item-name-real').text().trim();

      if (role.includes('coach')) {
        // Only set coach if not already set (prefer head coach if multiple?)
        // The requirement says "broaden", let's just pick the last one found or first one.
        // User suggested: coach = $(el).find('.team-roster-item-name-alias').text().trim();
        if (!coach || role.includes('head')) {
          coach = alias;
        }
      } else {
        players.push({
          player: alias,
          realName: realName
        });
      }
    });

    // Then check staff section if coach still not found
    if (!coach) {
      $('.team-staff-item').each((i, el) => {
        const role = $(el).find('.team-staff-item-role').text().trim().toLowerCase();
        if (role.includes('coach')) {
          coach = $(el).find('.team-staff-item-name-alias').text().trim();
        }
      });
    }
>>>>
```

### Task 3: Verify and Commit

- [ ] **Step 1: Update test to match new logic and run it**

- [ ] **Step 2: Run all tests**

- [ ] **Step 3: Commit changes**

```bash
git add src/valo.ts
git commit -m "fix(valo): broaden coach extraction and exclude coaches from players list"
```
