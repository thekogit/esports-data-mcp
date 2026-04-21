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
      },
      {
        name: "get_cs2_player_map_performance",
        description: "Get player stats on chosen maps",
        inputSchema: {
          type: "object",
          properties: { playerId: { type: "number" } },
          required: ["playerId"]
        }
      },
      {
        name: "get_cs2_team_info",
        description: "Get team tiers and active rosters",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "number" } },
          required: ["teamId"]
        }
      },
      {
        name: "get_cs2_player_stats",
        description: "Get historical performance for a player",
        inputSchema: {
          type: "object",
          properties: { playerId: { type: "number" } },
          required: ["playerId"]
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
  if (request.params.name === "get_cs2_player_map_performance") {
    // simplified implementation
    const playerId = request.params.arguments?.playerId as number;
    const stats = await HLTV.getPlayerStats({ id: playerId });
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
  }
  if (request.params.name === "get_cs2_team_info") {
    const teamId = request.params.arguments?.teamId as number;
    const info = await HLTV.getTeam({ id: teamId });
    return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
  }
  if (request.params.name === "get_cs2_player_stats") {
    const playerId = request.params.arguments?.playerId as number;
    const stats = await HLTV.getPlayerStats({ id: playerId });
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
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
