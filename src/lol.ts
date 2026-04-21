import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fetchHtml } from './utils/fetcher';
import { getLiquipediaTournaments, getLiquipediaRoster } from './utils/liquipedia';
import * as cheerio from 'cheerio';

const server = new Server(
  { name: "lol-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_lol_tournaments",
        description: "Get pro and semi-pro tournaments from Liquipedia",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_lol_team_info",
        description: "Get detailed team info and roster from Liquipedia",
        inputSchema: {
          type: "object",
          properties: { teamName: { type: "string" } },
          required: ["teamName"]
        }
      },
      {
        name: "get_lol_player_info",
        description: "Get detailed player info and history from Liquipedia",
        inputSchema: {
          type: "object",
          properties: { playerName: { type: "string" } },
          required: ["playerName"]
        }
      },
      {
        name: "get_lol_counters",
        description: "Scrape OP.GG for champion counters",
        inputSchema: {
          type: "object",
          properties: { championName: { type: "string" } },
          required: ["championName"]
        }
      },
      {
        name: "get_lol_matches",
        description: "Get upcoming and ongoing LoL matches from Liquipedia with simulated odds",
        inputSchema: { type: "object", properties: {} }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};

  if (request.params.name === "get_lol_tournaments") {
    const data = await getLiquipediaTournaments('leagueoflegends');
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
  
  if (request.params.name === "get_lol_team_info") {
    const team = args.teamName as string;
    const roster = await getLiquipediaRoster('leagueoflegends', team);
    return { content: [{ type: "text", text: JSON.stringify(roster, null, 2) }] };
  }

  if (request.params.name === "get_lol_player_info") {
    const player = args.playerName as string;
    const html = await fetchHtml(`https://liquipedia.net/leagueoflegends/${player}`);
    const $ = cheerio.load(html);
    const info: any = {
      name: $('.infobox-header').first().text().trim(),
      teams: $('.infobox-cell-2').text().trim(),
      history: $('.wikitable-tournament-results').text().trim(), // basic scrape
    };
    return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
  }

  if (request.params.name === "get_lol_counters") {
    const champ = (args.championName as string).toLowerCase();
    const html = await fetchHtml(`https://op.gg/champions/${champ}/counters`).catch(() => null);
    if (!html) return { content: [{ type: "text", text: "Failed to fetch data" }] };
    
    const $ = cheerio.load(html);
    const counters: string[] = [];
    $('.champion-box .name').each((i, el) => {
      counters.push($(el).text().trim());
    });
    return { content: [{ type: "text", text: JSON.stringify(counters, null, 2) }] };
  }

  if (request.params.name === "get_lol_matches") {
    const url = "https://liquipedia.net/leagueoflegends/Liquipedia:Upcoming_and_ongoing_matches";
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const matches: any[] = [];
    
    $('.infobox_matches_content').each((i, el) => {
      if (matches.length >= 15) return;
      
      const team1 = $(el).find('.team-left').text().trim();
      const team2 = $(el).find('.team-right').text().trim();
      const time = $(el).find('.timer-object').text().trim();
      
      if (team1 && team2) {
        // Simulated odds
        const odds1 = (1.5 + Math.random()).toFixed(2);
        const odds2 = (1.5 + Math.random()).toFixed(2);
        
        matches.push({
          teams: `${team1} vs ${team2}`,
          time: time || "TBD",
          odds: `${odds1} / ${odds2}`
        });
      }
    });
    
    return { content: [{ type: "text", text: JSON.stringify(matches, null, 2) }] };
  }
  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LoL MCP Server running");
}

main().catch(console.error);
