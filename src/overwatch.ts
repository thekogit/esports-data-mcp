import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fetchHtml } from './utils/fetcher';
import { getLiquipediaTournaments, getLiquipediaRoster } from './utils/liquipedia';
import * as cheerio from 'cheerio';

const server = new Server(
  { name: "overwatch-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_ow_player_stats",
        description: "Get Overwatch 2 player statistics by scraping Overbuff",
        inputSchema: {
          type: "object",
          properties: { battletag: { type: "string" } },
          required: ["battletag"]
        }
      },
      {
        name: "get_ow_tournaments",
        description: "List all Overwatch tournaments (OWCS, World Cup, etc.)",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_ow_live_matches",
        description: "Get upcoming and live OWCS matches from Liquipedia",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_ow_team_info",
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

  if (request.params.name === "get_ow_player_stats") {
    const tag = (args.battletag as string).replace('#', '-');
    const html = await fetchHtml(`https://www.overbuff.com/players/${tag}`).catch(() => null);
    if (!html) return { content: [{ type: "text", text: "Profile private or not found" }] };
    const $ = cheerio.load(html);
    const stats = $('.stats-container').text().trim();
    return { content: [{ type: "text", text: JSON.stringify({ stats }) }] };
  }

  if (request.params.name === "get_ow_tournaments") {
    const data = await getLiquipediaTournaments('overwatch');
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }

  if (request.params.name === "get_ow_live_matches") {
    const html = await fetchHtml('https://liquipedia.net/overwatch/Liquipedia:Upcoming_and_ongoing_matches').catch(() => null);
    if (!html) return { content: [{ type: "text", text: "Matches unavailable" }] };
    const $ = cheerio.load(html);
    const matches: any[] = [];
    $('.infobox_matches_content').each((i, el) => {
       matches.push($(el).text().trim());
    });
    return { content: [{ type: "text", text: JSON.stringify(matches.slice(0, 10)) }] };
  }

  if (request.params.name === "get_ow_team_info") {
    const team = args.teamName as string;
    const roster = await getLiquipediaRoster('overwatch', team.replace(/ /g, '_'));
    return { content: [{ type: "text", text: JSON.stringify(roster) }] };
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Overwatch MCP Server running");
}

main().catch(console.error);
