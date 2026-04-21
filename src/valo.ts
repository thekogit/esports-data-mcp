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
      },
      {
        name: "get_valo_player_stats",
        description: "Get individual historical data via unofficial API",
        inputSchema: {
          type: "object",
          properties: { 
            name: { type: "string" },
            tag: { type: "string" },
            region: { type: "string" }
          },
          required: ["name", "tag", "region"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_valo_counters_synergies") {
    const agent = request.params.arguments?.agentName as string;
    const { data } = await axios.get(`https://valorantdatalab.com/api/synergy.php?agent=${agent}`).catch(() => ({ data: "Fallback or rate limited" }));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
  if (request.params.name === "get_valo_player_stats") {
    const { name, tag, region } = request.params.arguments as { name: string, tag: string, region: string };
    const { data } = await axios.get(`https://api.henrikdev.xyz/valorant/v1/mmr/${region}/${name}/${tag}`).catch(() => ({ data: "Not found or rate limited" }));
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
