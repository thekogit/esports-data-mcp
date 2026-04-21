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
        name: "get_cs2_events",
        description: "List all HLTV events (all tiers)",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_cs2_matches",
        description: "Get live scorebot and upcoming matches with odds",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_cs2_team_rankings",
        description: "Get global rankings (limited to top 20)",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_cs2_map_performance",
        description: "Get team performance on specific maps",
        inputSchema: {
          type: "object",
          properties: { 
            teamId: { type: "number" },
            mapName: { type: "string" }
          },
          required: ["teamId"]
        }
      },
      {
        name: "get_cs2_player_stats",
        description: "Get historical performance metrics for a player",
        inputSchema: {
          type: "object",
          properties: { playerId: { type: "number" } },
          required: ["playerId"]
        }
      },
      {
        name: "get_cs2_player_map_performance",
        description: "Get player performance on specific maps",
        inputSchema: {
          type: "object",
          properties: { 
            playerId: { type: "number" },
            mapName: { type: "string" }
          },
          required: ["playerId", "mapName"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};
  
  if (request.params.name === "get_cs2_events") {
    const events = await HLTV.getEvents();
    return { content: [{ type: "text", text: JSON.stringify(events, null, 2) }] };
  }
  
  if (request.params.name === "get_cs2_matches") {
    const matches = await HLTV.getMatches();
    return { content: [{ type: "text", text: JSON.stringify(matches.slice(0, 15), null, 2) }] };
  }

  if (request.params.name === "get_cs2_team_rankings") {
    const rankings = await HLTV.getTeamRanking();
    return { content: [{ type: "text", text: JSON.stringify(rankings.slice(0, 20), null, 2) }] };
  }

  if (request.params.name === "get_cs2_player_stats") {
    const stats = await HLTV.getPlayerStats({ id: args.playerId as number });
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
  }

  if (request.params.name === "get_cs2_map_performance") {
    const stats = await HLTV.getTeamStats({ id: args.teamId as number });
    return { content: [{ type: "text", text: JSON.stringify(stats.mapStats, null, 2) }] };
  }

  if (request.params.name === "get_cs2_player_map_performance") {
    const stats = await HLTV.getPlayerStats({ 
      id: args.playerId as number,
      maps: args.mapName ? [args.mapName as any] : undefined
    });
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
