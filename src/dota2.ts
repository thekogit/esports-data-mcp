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
      },
      {
        name: "get_dota2_team_info",
        description: "Get pro team rosters",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "number" } },
          required: ["teamId"]
        }
      },
      {
        name: "get_dota2_player_stats",
        description: "Get pro player historical data",
        inputSchema: {
          type: "object",
          properties: { accountId: { type: "number" } },
          required: ["accountId"]
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
  if (request.params.name === "get_dota2_team_info") {
    const teamId = request.params.arguments?.teamId as number;
    const { data } = await axios.get(`https://api.opendota.com/api/teams/${teamId}/players`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
  if (request.params.name === "get_dota2_player_stats") {
    const accountId = request.params.arguments?.accountId as number;
    const { data } = await axios.get(`https://api.opendota.com/api/players/${accountId}/wl`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dota 2 MCP Server running");
}

main().catch(console.error);
