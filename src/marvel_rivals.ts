import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import { fetchHtml } from './utils/fetcher';
import { getLiquipediaTournaments, getLiquipediaRoster } from './utils/liquipedia';
import * as cheerio from 'cheerio';

const server = new Server(
  { name: "marvel-rivals-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_rivals_player_stats",
        description: "Get Marvel Rivals player statistics",
        inputSchema: {
          type: "object",
          properties: { username: { type: "string" } },
          required: ["username"]
        }
      },
      {
        name: "get_rivals_counters_synergies",
        description: "Get current hero counters and team-up synergies",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_rivals_tournaments",
        description: "List all Marvel Rivals tournaments (Ignite, MRC, etc.)",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_rivals_team_info",
        description: "Get detailed team info and roster from Liquipedia",
        inputSchema: {
          type: "object",
          properties: { teamName: { type: "string" } },
          required: ["teamName"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};

  if (request.params.name === "get_rivals_player_stats") {
    // Using unofficial API or tracker scrape
    const { data } = await axios.get(`https://marvelrivalsapi.com/api/v1/player/${args.username}`).catch(() => ({ data: "Rate limited or player not found" }));
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (request.params.name === "get_rivals_counters_synergies") {
    const html = await fetchHtml('https://peakrivals.com/counters').catch(() => null);
    if (!html) return { content: [{ type: "text", text: "Data unavailable" }] };
    const $ = cheerio.load(html);
    const counters = $('.counter-card').map((i, el) => $(el).text().trim()).get();
    return { content: [{ type: "text", text: JSON.stringify(counters.slice(0, 10), null, 2) }] };
  }

  if (request.params.name === "get_rivals_tournaments") {
    const data = await getLiquipediaTournaments('marvelrivals');
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (request.params.name === "get_rivals_team_info") {
    const roster = await getLiquipediaRoster('marvelrivals', args.teamName as string);
    return { content: [{ type: "text", text: JSON.stringify(roster, null, 2) }] };
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Marvel Rivals MCP Server running");
}

main().catch(console.error);
