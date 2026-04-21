import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getLiquipediaTournaments } from './utils/liquipedia';
import { fetchJson } from './utils/fetcher';

const server = new Server(
  { name: "dota2-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_dota2_leagues",
        description: "List all active leagues and tournaments",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_dota2_live_matches",
        description: "Get real-time scores and in-game stats for pro matches",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_dota2_team_info",
        description: "Get detailed pro team info and history",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "number" } },
          required: ["teamId"]
        }
      },
      {
        name: "get_dota2_player_info",
        description: "Get detailed pro player info and historical stats",
        inputSchema: {
          type: "object",
          properties: { accountId: { type: "number" } },
          required: ["accountId"]
        }
      },
      {
        name: "get_dota2_hero_stats",
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
  const args = request.params.arguments || {};

  if (request.params.name === "get_dota2_leagues") {
    const data = await getLiquipediaTournaments('dota2');
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (request.params.name === "get_dota2_live_matches") {
    const data = await fetchJson('https://api.opendota.com/api/live');
    return { content: [{ type: "text", text: JSON.stringify(data.slice(0, 10), null, 2) }] };
  }

  if (request.params.name === "get_dota2_team_info") {
    const data = await fetchJson(`https://api.opendota.com/api/teams/${args.teamId}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (request.params.name === "get_dota2_player_info") {
    const data = await fetchJson(`https://api.opendota.com/api/players/${args.accountId}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (request.params.name === "get_dota2_hero_stats") {
    const heroId = args.heroId as number;
    const data = await fetchJson(`https://api.opendota.com/api/heroes/${heroId}/matchups`);
    return { content: [{ type: "text", text: JSON.stringify(data.slice(0, 15), null, 2) }] };
  }
  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dota 2 MCP Server running");
}

main().catch(console.error);
