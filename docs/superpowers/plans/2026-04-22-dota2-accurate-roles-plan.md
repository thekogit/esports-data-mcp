# Accurate Dota 2 Role Identification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correctly identify and label player roles (Carry, Mid, Offlane, Soft Support, Hard Support) for Dota 2 matches using a combination of OpenDota Live API and a Hero-to-Position solver algorithm.

**Architecture:** 
1. A new position solver utility that assigns positions 1-5 by scoring hero-role compatibility across all possible team permutations (5! = 120).
2. Updates to the `parseHawkLiveMatch` function to first try fetching accurate roles from the OpenDota Live API. If not found or if the match is completed, it falls back to the position solver to re-order the parsed drafts.
3. A new MCP tool `identify_dota2_roles` for independent role identification.

**Tech Stack:** TypeScript, Jest, Axios/fetcher

---

### Task 1: Implement Position Solver Utility

**Files:**
- Create: `src/utils/dota2_roles.ts`
- Create: `src/utils/dota2_roles.test.ts`

- [ ] **Step 1: Write the failing test for the position solver**

Write to `src/utils/dota2_roles.test.ts`:
```typescript
import { solvePositions, POSITION_MAP } from './dota2_roles';

describe('solvePositions', () => {
  it('correctly assigns roles for Nemiga Gaming draft', () => {
    // Nemiga Gaming (Techies, Disruptor, Slardar, Axe, Faceless Void)
    const heroes = [
      { id: 105, localized_name: 'Techies', roles: ['Nuker', 'Disabler'] }, // Often 4/5
      { id: 87, localized_name: 'Disruptor', roles: ['Support', 'Disabler', 'Nuker', 'Initiator'] }, // Often 5
      { id: 28, localized_name: 'Slardar', roles: ['Carry', 'Durable', 'Initiator', 'Disabler', 'Escape'] }, // Often 3
      { id: 2, localized_name: 'Axe', roles: ['Initiator', 'Durable', 'Disabler', 'Carry'] }, // Often 3/4
      { id: 41, localized_name: 'Faceless Void', roles: ['Carry', 'Initiator', 'Disabler', 'Escape', 'Durable'] } // Carry
    ];

    const positions = solvePositions(heroes);

    expect(positions['Faceless Void']).toBe(1); // Carry
    // The exact distribution of the others might vary slightly based on scoring, but Void MUST be 1.
    // Slardar or Axe should be 3.
    expect(positions['Slardar'] === 3 || positions['Axe'] === 3).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/dota2_roles.test.ts`
Expected: FAIL with "Cannot find module" or "solvePositions is not a function"

- [ ] **Step 3: Write minimal implementation**

Write to `src/utils/dota2_roles.ts`:
```typescript
export interface HeroRoleInfo {
  id: number;
  localized_name: string;
  roles: string[];
}

export const POSITION_MAP: Record<number, string> = {
  1: 'Carry',
  2: 'Mid',
  3: 'Offlane',
  4: 'Soft Support',
  5: 'Hard Support'
};

// Simplified scoring logic based on typical Dota 2 role combinations
function scoreAssignment(hero: HeroRoleInfo, position: number): number {
  let score = 0;
  const roles = hero.roles.map(r => r.toLowerCase());
  
  if (position === 1) { // Carry
    if (roles.includes('carry')) score += 10;
    else score -= 10;
  } else if (position === 2) { // Mid
    if (roles.includes('nuker') || roles.includes('escape')) score += 5;
    if (roles.includes('carry')) score += 2;
  } else if (position === 3) { // Offlane
    if (roles.includes('durable') || roles.includes('initiator')) score += 8;
  } else if (position === 4) { // Soft Support
    if (roles.includes('support') || roles.includes('disabler') || roles.includes('nuker')) score += 6;
  } else if (position === 5) { // Hard Support
    if (roles.includes('support')) score += 10;
    if (roles.includes('disabler')) score += 4;
  }

  return score;
}

// Generate permutations of [1, 2, 3, 4, 5]
function getPermutations(arr: number[]): number[][] {
  if (arr.length === 0) return [[]];
  const result: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    const remainingPerms = getPermutations(remaining);
    for (const perm of remainingPerms) {
      result.push([current].concat(perm));
    }
  }
  return result;
}

export function solvePositions(heroes: HeroRoleInfo[]): Record<string, number> {
  if (heroes.length !== 5) {
    // If not exactly 5 heroes, just return their current index + 1 as a fallback
    return heroes.reduce((acc, h, i) => ({ ...acc, [h.localized_name]: i + 1 }), {});
  }

  const perms = getPermutations([1, 2, 3, 4, 5]);
  let bestScore = -Infinity;
  let bestPerm: number[] = [1, 2, 3, 4, 5];

  for (const perm of perms) {
    let currentScore = 0;
    for (let i = 0; i < 5; i++) {
      currentScore += scoreAssignment(heroes[i], perm[i]);
    }
    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestPerm = perm;
    }
  }

  const result: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    result[heroes[i].localized_name] = bestPerm[i];
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/utils/dota2_roles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/dota2_roles.ts src/utils/dota2_roles.test.ts
git commit -m "feat(dota2): implement position solver algorithm"
```

---

### Task 2: Integrate OpenDota Live API and Solver into Hawk Live Parser

**Files:**
- Modify: `src/utils/hawk_live.ts`

- [ ] **Step 1: Write the failing test**

We don't have a test suite for `hawk_live.ts` currently, but we should create a basic one to test the integration.
Create `src/utils/hawk_live.test.ts`:
```typescript
import { enrichDraftRoles } from './hawk_live';
import { DraftHero } from './hawk_live';

describe('enrichDraftRoles', () => {
  it('re-orders draft based on solver if no live data is provided', async () => {
    const radiant: DraftHero[] = [
      { hero: 'Faceless Void' },
      { hero: 'Slardar' },
      { hero: 'Disruptor' },
      { hero: 'Axe' },
      { hero: 'Techies' }
    ];
    
    // We mock fetchJson inside enrichDraftRoles to return openDota heroes
    // For testing simplicity, we will just verify the signature and behavior if we inject heroes.
    // Let's test the inner logic or export an enrich function that takes heroes.
  });
});
```
Wait, integration with external API is better tested manually or via mocking. Since the plan should be simple:
Let's just update the implementation directly for `parseHawkLiveMatch`. We will skip the TDD step for this specific integration if it relies heavily on external APIs, but we can write a test for a helper function.

Let's revise Task 2 to create a helper `enrichDraftWithPositions` that takes the parsed draft and a list of all heroes.

- [ ] **Step 1: Write the failing test**

Write to `src/utils/hawk_live.test.ts`:
```typescript
import { enrichDraftWithPositions } from './hawk_live';

describe('enrichDraftWithPositions', () => {
  it('correctly assigns positions using solver', () => {
    const draft = [
      { hero: 'Techies', position: 1, role: 'Carry' }, // Incorrect initial parse
      { hero: 'Faceless Void', position: 5, role: 'Hard Support' }
    ];
    const heroes = [
      { id: 105, localized_name: 'Techies', roles: ['Nuker', 'Disabler'] },
      { id: 41, localized_name: 'Faceless Void', roles: ['Carry', 'Initiator', 'Disabler', 'Escape', 'Durable'] }
    ];
    // Pad to 5 for solver
    const fullDraft = [
      ...draft,
      { hero: 'Disruptor' }, { hero: 'Slardar' }, { hero: 'Axe' }
    ];
    const fullHeroes = [
      ...heroes,
      { id: 87, localized_name: 'Disruptor', roles: ['Support'] },
      { id: 28, localized_name: 'Slardar', roles: ['Offlane'] },
      { id: 2, localized_name: 'Axe', roles: ['Offlane'] }
    ];

    const enriched = enrichDraftWithPositions(fullDraft, fullHeroes);
    const voidPick = enriched.find(d => d.hero === 'Faceless Void');
    expect(voidPick?.position).toBe(1);
    expect(voidPick?.role).toBe('Carry');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/hawk_live.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Modify `src/utils/hawk_live.ts`:
Add imports at the top:
```typescript
import { solvePositions, POSITION_MAP, HeroRoleInfo } from './dota2_roles';
import { fetchJson } from './fetcher';
```

Add the `enrichDraftWithPositions` function:
```typescript
export function enrichDraftWithPositions(draft: DraftHero[], allHeroes: HeroRoleInfo[]): DraftHero[] {
  if (draft.length !== 5) return draft;

  const draftHeroInfos = draft.map(d => {
    // Find the hero by name (case-insensitive, basic matching)
    const h = allHeroes.find(ah => ah.localized_name.toLowerCase() === d.hero.toLowerCase());
    return h || { id: 0, localized_name: d.hero, roles: [] };
  });

  const solvedPositions = solvePositions(draftHeroInfos);

  return draft.map(d => {
    const pos = solvedPositions[d.hero] || d.position;
    return {
      ...d,
      position: pos,
      role: POSITION_MAP[pos] || d.role
    };
  }).sort((a, b) => (a.position || 0) - (b.position || 0));
}
```

Update `parseHawkLiveMatch` to use it (we will need to fetch heroes):
```typescript
// Inside parseHawkLiveMatch, before returning:
try {
  const allHeroes = await fetchJson('https://api.opendota.com/api/heroes');
  radiantDraft = enrichDraftWithPositions(radiantDraft, allHeroes);
  direDraft = enrichDraftWithPositions(direDraft, allHeroes);
} catch (e) {
  console.error("Failed to enrich draft roles", e);
}

return {
  teamA,
  teamB,
  score: scoreText,
  gameTime,
  draft: {
    radiant: radiantDraft.slice(0, 5),
    dire: direDraft.slice(0, 5)
  }
};
```
Note: Ensure `radiantDraft` and `direDraft` are updated instead of reassigned if they are `const`, so change `const radiantDraft` to `let radiantDraft`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/utils/hawk_live.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/hawk_live.ts src/utils/hawk_live.test.ts
git commit -m "feat(dota2): enrich parsed drafts with position solver"
```

---

### Task 3: Add `identify_dota2_roles` Tool

**Files:**
- Modify: `src/dota2.ts`

- [ ] **Step 1: Write the failing test**

We don't have unit tests for the MCP server handlers directly, but we can verify by running the MCP test script or simply implementing the tool. Since the tool exposes our tested `solvePositions`, we will implement it directly.

- [ ] **Step 2: Write minimal implementation**

Modify `src/dota2.ts`:
Import `solvePositions`:
```typescript
import { solvePositions, POSITION_MAP } from './utils/dota2_roles';
```

In `ListToolsRequestSchema` handler, add:
```typescript
      {
        name: "identify_dota2_roles",
        description: "Given a list of 5 hero IDs or names for a team, identifies their most likely positions (1-5) and roles.",
        inputSchema: {
          type: "object",
          properties: {
            heroes: { 
              type: "array", 
              items: { type: "string" }, 
              minItems: 5, 
              maxItems: 5,
              description: "List of 5 hero names (e.g. ['Faceless Void', 'Techies', ...])" 
            }
          },
          required: ["heroes"]
        }
      },
```

In `CallToolRequestSchema` handler, add:
```typescript
  if (request.params.name === "identify_dota2_roles") {
    const heroNames = args.heroes as string[];
    const allHeroes = await getHeroes();
    
    const teamHeroes = heroNames.map(name => {
      const h = allHeroes.find(ah => ah.localized_name.toLowerCase() === name.toLowerCase());
      return h || { id: 0, localized_name: name, primary_attr: '', attack_type: '', roles: [] };
    });

    const solved = solvePositions(teamHeroes);
    
    const results = heroNames.map(name => {
      const pos = solved[name] || 0;
      return {
        hero: name,
        position: pos,
        role: POSITION_MAP[pos] || "Unknown"
      };
    }).sort((a, b) => a.position - b.position);

    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
```

- [ ] **Step 3: Run typescript compilation to verify no errors**

Run: `npm run build`
Expected: PASS (no TS errors)

- [ ] **Step 4: Commit**

```bash
git add src/dota2.ts
git commit -m "feat(dota2): add identify_dota2_roles MCP tool"
```
