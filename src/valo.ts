import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fetchHtml, fetchJson } from './utils/fetcher';
import * as cheerio from 'cheerio';

const server = new Server(
  { name: "valo-mcp", version: "1.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_valo_matches",
        description: "Get live and upcoming matches from vlr.gg",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_valo_events",
        description: "List tournaments by tier",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["upcoming", "ongoing", "completed"] },
            tier: { type: "string" }
          }
        }
      },
      {
        name: "get_valo_team_info",
        description: "Get detailed team info and roster from vlr.gg",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "string" } },
          required: ["teamId"]
        }
      },
      {
        name: "get_valo_player_info",
        description: "Get detailed player info and history from vlr.gg",
        inputSchema: {
          type: "object",
          properties: { playerId: { type: "string" } },
          required: ["playerId"]
        }
      },
      {
        name: "get_valo_agent_stats",
        description: "Get agent synergies and counters",
        inputSchema: {
          type: "object",
          properties: { agentName: { type: "string" } },
          required: ["agentName"]
        }
      },
      {
        name: "get_valo_match_history",
        description: "Get historical matches for a team from vlr.gg to analyze form",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "string" } },
          required: ["teamId"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};

  if (request.params.name === "get_valo_matches") {
    const html = await fetchHtml('https://www.vlr.gg/matches');
    const $ = cheerio.load(html);
    const matches: any[] = [];
    $('.match-item').each((i, el) => {
      const teamNames = $(el).find('.match-item-vs-team-name').map((i, team) => $(team).text().trim()).get();
      if (teamNames.length === 2) {
        matches.push({
          teams: teamNames,
          eta: $(el).find('.match-item-eta').text().trim(),
          event: $(el).find('.match-item-event').text().trim(),
          url: $(el).attr('href')
        });
      }
    });
    return { content: [{ type: "text", text: JSON.stringify(matches.slice(0, 20), null, 2) }] };
  }
  
  if (request.params.name === "get_valo_events") {
    const status = (args.status as string) || 'ongoing';
    const html = await fetchHtml(`https://www.vlr.gg/events?status=${status}`);
    const $ = cheerio.load(html);
    const events: any[] = [];
    $('.event-item').each((i, el) => {
      events.push({
        name: $(el).find('.event-item-title').text().trim(),
        dates: $(el).find('.event-item-desc').text().trim(),
      });
    });
    return { content: [{ type: "text", text: JSON.stringify(events.slice(0, 20), null, 2) }] };
  }

  if (request.params.name === "get_valo_team_info") {
    const html = await fetchHtml(`https://www.vlr.gg/team/${args.teamId}`);
    const $ = cheerio.load(html);
    const team: any = {
      name: $('.team-header-name h1').text().trim(),
      roster: $('.team-roster-item').map((i, el) => ({
        player: $(el).find('.team-roster-item-name-alias').text().trim(),
        realName: $(el).find('.team-roster-item-name-real').text().trim(),
      })).get()
    };
    return { content: [{ type: "text", text: JSON.stringify(team, null, 2) }] };
  }

  if (request.params.name === "get_valo_player_info") {
    const html = await fetchHtml(`https://www.vlr.gg/player/${args.playerId}`);
    const $ = cheerio.load(html);
    const player: any = {
      name: $('.player-header-name h1').text().trim(),
      teams: $('.player-header-teams').text().trim(),
      stats: $('.player-stats-table').text().trim(), // basic scrape of stats
    };
    return { content: [{ type: "text", text: JSON.stringify(player, null, 2) }] };
  }

  if (request.params.name === "get_valo_agent_stats") {
    const agent = args.agentName as string;
    try {
      const data = await fetchJson(`https://valorantdatalab.com/api/synergy.php?agent=${agent}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: "Stats temporarily unavailable or rate limited." }] };
    }
  }

  if (request.params.name === "get_valo_match_history") {
    const html = await fetchHtml(`https://www.vlr.gg/team/matches/${args.teamId}/?group=completed`);
    const $ = cheerio.load(html);
    const matches: any[] = [];
    $('.m-item').each((i, el) => {
      if (matches.length >= 15) return;
      matches.push({
        event: $(el).find('.m-item-event').text().trim(),
        date: $(el).find('.m-item-date').text().trim(),
        team1: $(el).find('.m-item-team-name').eq(0).text().trim(),
        score1: $(el).find('.m-item-result').find('span').eq(0).text().trim(),
        score2: $(el).find('.m-item-result').find('span').eq(1).text().trim(),
        team2: $(el).find('.m-item-team-name').eq(1).text().trim(),
      });
    });
    return { content: [{ type: "text", text: JSON.stringify(matches, null, 2) }] };
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Valorant MCP Server running");
}

main().catch(console.error);
