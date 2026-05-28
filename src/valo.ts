import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fetchHtml, fetchJson } from './utils/fetcher';
import { searchEGWTeams, getEGWLiveMatches } from './utils/egamersworld';
import * as cheerio from 'cheerio';
import { z } from "zod";

// Zod schemas for tool validation
const GetValoEventsSchema = z.object({
  status: z.string().optional(),
  tier: z.string().optional()
});

const GetValoTeamInfoSchema = z.object({
  teamId: z.string()
});

const GetValoPlayerInfoSchema = z.object({
  playerId: z.string()
});

const GetValoAgentStatsSchema = z.object({
  agentName: z.string()
});

const GetValoMatchHistorySchema = z.object({
  teamId: z.string()
});

const SearchValoEGWTeamsSchema = z.object({
  name: z.string()
});

export function registerValoTools(server: Server) {
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
        },
        {
          name: "search_valo_egw_teams",
          description: "Search for Valorant teams on EGamersWorld (high accuracy for smaller/newer teams)",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"]
          }
        },
        {
          name: "get_valo_egw_live_matches",
          description: "Get live Valorant matches from EGamersWorld",
          inputSchema: { type: "object", properties: {} }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments || {};
    const name = request.params.name;

    try {
      if (name === "search_valo_egw_teams") {
        const validated = SearchValoEGWTeamsSchema.parse(args);
        const teams = await searchEGWTeams('valorant', validated.name);
        return { content: [{ type: "text", text: JSON.stringify(teams) }] };
      }

      if (name === "get_valo_egw_live_matches") {
        const matches = await getEGWLiveMatches('valorant');
        return { content: [{ type: "text", text: JSON.stringify(matches) }] };
      }

      if (name === "get_valo_matches") {
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
        return { content: [{ type: "text", text: JSON.stringify(matches.slice(0, 20)) }] };
      }
      
      if (name === "get_valo_events") {
        const validated = GetValoEventsSchema.parse(args);
        const status = validated.status || 'ongoing';
        const html = await fetchHtml(`https://www.vlr.gg/events?status=${status}`);
        const $ = cheerio.load(html);
        const events: any[] = [];
        $('.event-item').each((i, el) => {
          events.push({
            name: $(el).find('.event-item-title').text().trim(),
            dates: $(el).find('.event-item-desc').text().trim(),
          });
        });
        return { content: [{ type: "text", text: JSON.stringify(events.slice(0, 20)) }] };
      }

      if (name === "get_valo_team_info") {
        const validated = GetValoTeamInfoSchema.parse(args);
        const html = await fetchHtml(`https://www.vlr.gg/team/${validated.teamId}`);
        const $ = cheerio.load(html);
        
        let coach: string | null = null;
        const players: any[] = [];

        $('.team-roster-item').each((i, el) => {
          const alias = $(el).find('.team-roster-item-name-alias').text().trim();
          const realName = $(el).find('.team-roster-item-name-real').text().trim();
          const role = $(el).find('.team-roster-item-name-role').text().trim().toLowerCase();

          if (role.includes('coach')) {
            coach = alias;
          } else if (alias) {
            players.push({ player: alias, realName });
          }
        });

        // Fallback to staff section if coach still not found
        if (!coach) {
          $('.team-staff-item').each((i, el) => {
            const role = $(el).find('.team-staff-item-role').text().trim().toLowerCase();
            if (role.includes('coach')) {
              coach = $(el).find('.team-staff-item-name-alias').text().trim();
            }
          });
        }

        const team: any = {
          name: $('.team-header-name h1').text().trim(),
          roster: players,
          coach: coach
        };
        return { content: [{ type: "text", text: JSON.stringify(team) }] };
      }

      if (name === "get_valo_player_info") {
        const validated = GetValoPlayerInfoSchema.parse(args);
        const html = await fetchHtml(`https://www.vlr.gg/player/${validated.playerId}`);
        const $ = cheerio.load(html);
        
        const stats: any = {};
        $('.player-stats-item').each((i, el) => {
          const label = $(el).find('.player-stats-item-label').text().trim().toLowerCase().replace(' ', '_');
          const val = $(el).find('.player-stats-item-val').text().trim();
          if (label) stats[label] = val;
        });

        const player: any = {
          name: $('.player-header-name h1').text().trim(),
          alias: $('.player-header-name h2').text().trim(),
          current_team: $('.player-header-teams').text().trim(),
          stats: stats
        };
        return { content: [{ type: "text", text: JSON.stringify(player) }] };
      }

      if (name === "get_valo_agent_stats") {
        const validated = GetValoAgentStatsSchema.parse(args);
        const agent = validated.agentName;
        try {
          const data = await fetchJson(`https://valorantdatalab.com/api/synergy.php?agent=${agent}`);
          return { content: [{ type: "text", text: JSON.stringify(data) }] };
        } catch (error) {
          return { content: [{ type: "text", text: "Stats temporarily unavailable or rate limited." }] };
        }
      }

      if (name === "get_valo_match_history") {
        const validated = GetValoMatchHistorySchema.parse(args);
        const html = await fetchHtml(`https://www.vlr.gg/team/matches/${validated.teamId}/?group=completed`);
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
        return { content: [{ type: "text", text: JSON.stringify(matches) }] };
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return {
          content: [{
            type: "text",
            text: `Invalid input: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          }],
          isError: true
        };
      }
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }

    throw new Error("Tool not found");
  });
}
