# Esports Betting MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single project that provides 4 separate MCP servers for LoL, Valorant, Dota 2, and CS2, extracting esports, player, and live data using free APIs and scraping.

**Architecture:** A TypeScript project with a shared `package.json`, compiled into 4 entry points (`dist/lol.js`, `dist/valo.js`, `dist/dota2.js`, `dist/cs2.js`).

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `axios`, `cheerio`, `hltv`, `jest` (for testing).

---

### Task 1: Project Setup and Dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Initialize Project**
```bash
npm init -y
npm install @modelcontextprotocol/sdk axios cheerio hltv
npm install -D typescript @types/node jest ts-jest @types/jest
```

- [ ] **Step 2: Configure TypeScript**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 3: Update package.json scripts**
Modify `package.json` to include build and test scripts.
```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest"
  }
}
```

- [ ] **Step 4: Configure Jest**
Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
};
```

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json tsconfig.json jest.config.js
git commit -m "chore: initial project setup"
```

---

### Task 2: Shared Utilities and Base MCP Setup

**Files:**
- Create: `src/utils/fetcher.ts`
- Test: `src/utils/fetcher.test.ts`

- [ ] **Step 1: Write failing test for fetcher**
```typescript
import { fetchHtml } from './fetcher';

describe('fetcher', () => {
  it('should fetch HTML content', async () => {
    const html = await fetchHtml('https://example.com');
    expect(html).toContain('Example Domain');
  });
});
```

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test src/utils/fetcher.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
```typescript
import axios from 'axios';

export async function fetchHtml(url: string): Promise<string> {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  return data;
}
```

- [ ] **Step 4: Run test to verify success**
Run: `npm run test src/utils/fetcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/utils/fetcher.ts src/utils/fetcher.test.ts
git commit -m "feat: add HTML fetcher utility"
```

---

### Task 3: CS2 Server Implementation

**Files:**
- Create: `src/cs2.ts`

- [ ] **Step 1: Create MCP Server Skeleton**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { HLTV } from 'hltv';

const server = new Server(
  { name: "cs2-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_cs2_team_map_performance",
        description: "Get team performance on specific maps",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "number" } },
          required: ["teamId"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_cs2_team_map_performance") {
    const teamId = request.params.arguments?.teamId as number;
    const stats = await HLTV.getTeamStats({ id: teamId });
    return { content: [{ type: "text", text: JSON.stringify(stats.mapStats, null, 2) }] };
  }
  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CS2 MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Build and Test Compilation**
Run: `npm run build`
Expected: `dist/cs2.js` is created successfully.

- [ ] **Step 3: Commit**
```bash
git add src/cs2.ts
git commit -m "feat: implement CS2 MCP server"
```

---

### Task 4: Dota 2 Server Implementation

**Files:**
- Create: `src/dota2.ts`

- [ ] **Step 1: Create Dota 2 MCP Server**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';

const server = new Server(
  { name: "dota2-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_dota2_counters_synergies",
        description: "Get hero matchups/counters from OpenDota",
        inputSchema: {
          type: "object",
          properties: { heroId: { type: "number" } },
          required: ["heroId"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_dota2_counters_synergies") {
    const heroId = request.params.arguments?.heroId as number;
    const { data } = await axios.get(`https://api.opendota.com/api/heroes/${heroId}/matchups`);
    return { content: [{ type: "text", text: JSON.stringify(data.slice(0, 10), null, 2) }] };
  }
  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dota 2 MCP Server running");
}

main().catch(console.error);
```

- [ ] **Step 2: Build and Test Compilation**
Run: `npm run build`
Expected: `dist/dota2.js` is created successfully.

- [ ] **Step 3: Commit**
```bash
git add src/dota2.ts
git commit -m "feat: implement Dota 2 MCP server"
```

---

### Task 5: Valorant Server Implementation

**Files:**
- Create: `src/valo.ts`

- [ ] **Step 1: Create Valorant MCP Server**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';

const server = new Server(
  { name: "valo-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_valo_counters_synergies",
        description: "Get Valorant agent synergies",
        inputSchema: {
          type: "object",
          properties: { agentName: { type: "string" } },
          required: ["agentName"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_valo_counters_synergies") {
    const agent = request.params.arguments?.agentName as string;
    // Using unoffical Data Lab API or scraping logic
    const { data } = await axios.get(`https://valorantdatalab.com/api/synergy.php?agent=${agent}`).catch(() => ({ data: "Fallback or rate limited" }));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Valorant MCP Server running");
}

main().catch(console.error);
```

- [ ] **Step 2: Build and Test Compilation**
Run: `npm run build`
Expected: `dist/valo.js` is created successfully.

- [ ] **Step 3: Commit**
```bash
git add src/valo.ts
git commit -m "feat: implement Valorant MCP server"
```

---

### Task 6: LoL Server Implementation

**Files:**
- Create: `src/lol.ts`

- [ ] **Step 1: Create LoL MCP Server**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fetchHtml } from './utils/fetcher';
import * as cheerio from 'cheerio';

const server = new Server(
  { name: "lol-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_lol_counters",
        description: "Scrape OP.GG for champion counters",
        inputSchema: {
          type: "object",
          properties: { championName: { type: "string" } },
          required: ["championName"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_lol_counters") {
    const champ = (request.params.arguments?.championName as string).toLowerCase();
    const html = await fetchHtml(`https://op.gg/champions/${champ}/counters`);
    const $ = cheerio.load(html);
    const counters: string[] = [];
    $('.champion-box .name').each((i, el) => {
      counters.push($(el).text().trim());
    });
    return { content: [{ type: "text", text: JSON.stringify(counters, null, 2) }] };
  }
  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LoL MCP Server running");
}

main().catch(console.error);
```

- [ ] **Step 2: Build and Test Compilation**
Run: `npm run build`
Expected: `dist/lol.js` is created successfully.

- [ ] **Step 3: Commit**
```bash
git add src/lol.ts
git commit -m "feat: implement LoL MCP server"
```

---

### Task 7: Final Documentation and mcp.json Snippet

**Files:**
- Create: `mcp-snippet.json`

- [ ] **Step 1: Create mcp.json snippet**
```json
{
  "mcpServers": {
    "esports-lol": {
      "command": "node",
      "args": ["C:/Users/user/esports_betting_mcp/dist/lol.js"],
      "cwd": "C:/Users/user/esports_betting_mcp"
    },
    "esports-valo": {
      "command": "node",
      "args": ["C:/Users/user/esports_betting_mcp/dist/valo.js"],
      "cwd": "C:/Users/user/esports_betting_mcp"
    },
    "esports-dota2": {
      "command": "node",
      "args": ["C:/Users/user/esports_betting_mcp/dist/dota2.js"],
      "cwd": "C:/Users/user/esports_betting_mcp"
    },
    "esports-cs2": {
      "command": "node",
      "args": ["C:/Users/user/esports_betting_mcp/dist/cs2.js"],
      "cwd": "C:/Users/user/esports_betting_mcp"
    }
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add mcp-snippet.json
git commit -m "docs: add mcp.json snippet"
```
