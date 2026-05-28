import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { HLTV } from 'hltv';
import { z } from "zod";
import { searchEGWTeams, getEGWLiveMatches } from './utils/egamersworld';

// Simple cache implementation
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

async function getCachedData(key: string, fetcher: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// Zod schemas for tool validation
const GetCS2TeamInfoSchema = z.object({
  teamId: z.number()
});

const GetCS2MapPerformanceSchema = z.object({
  teamId: z.number(),
  mapName: z.string().optional()
});

const GetCS2PlayerStatsSchema = z.object({
  playerId: z.number()
});

const GetCS2PlayerMapPerformanceSchema = z.object({
  playerId: z.number(),
  mapName: z.string()
});

const GetCS2TeamMatchHistorySchema = z.object({
  teamId: z.number()
});

const SearchCS2EGWTeamsSchema = z.object({
  name: z.string()
});

export function registerCS2Tools(server: Server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_cs2_events",
          description: "List all HLTV events (all tiers, limited to top 20)",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "get_cs2_matches",
          description: "Get live scorebot and upcoming matches. Note: If odds are null, fetch them via web-search (e.g., using google_web_search on vlr.gg or hltv.org).",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "get_cs2_team_info",
          description: "Get detailed information about a CS2 team",
          inputSchema: {
            type: "object",
            properties: { teamId: { type: "number" } },
            required: ["teamId"]
          }
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
        },
        {
          name: "get_cs2_team_match_history",
          description: "Get recent match history for a specific CS2 team",
          inputSchema: {
            type: "object",
            properties: { teamId: { type: "number" } },
            required: ["teamId"]
          }
        },
        {
          name: "search_cs2_egw_teams",
          description: "Search for CS2 teams on EGamersWorld (high accuracy for smaller/newer teams)",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"]
          }
        },
        {
          name: "get_cs2_egw_live_matches",
          description: "Get live CS2 matches from EGamersWorld",
          inputSchema: { type: "object", properties: {} }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments || {};
    const name = request.params.name;

    try {
      if (name === "search_cs2_egw_teams") {
        const validated = SearchCS2EGWTeamsSchema.parse(args);
        const teams = await searchEGWTeams('csgo', validated.name);
        return { content: [{ type: "text", text: JSON.stringify(teams) }] };
      }

      if (name === "get_cs2_egw_live_matches") {
        const matches = await getEGWLiveMatches('csgo');
        return { content: [{ type: "text", text: JSON.stringify(matches) }] };
      }

      if (name === "get_cs2_events") {
        const events = await getCachedData("events", () => HLTV.getEvents());
        return { content: [{ type: "text", text: JSON.stringify(events.slice(0, 20)) }] };
      }
      
      if (name === "get_cs2_matches") {
        const rawMatches = await getCachedData("matches", () => HLTV.getMatches());
        
        // Noise Reduction: Filter to essential data only
        const cleanMatches = rawMatches.map((m: any) => ({
          id: m.id,
          date: m.date ? new Date(m.date).toISOString().split('T')[0] : "TBD",
          team1: m.team1?.name || "TBD",
          team2: m.team2?.name || "TBD",
          format: m.format,
          event: m.event?.name || "Unknown",
          live: m.live,
          stars: m.stars,
          odds: m.odds || null
        })).slice(0, 15);

        return { content: [{ type: "text", text: JSON.stringify(cleanMatches) }] };
      }

      if (name === "get_cs2_team_info") {
        const validated = GetCS2TeamInfoSchema.parse(args);
        const teamId = validated.teamId;
        const teamInfo = await getCachedData(`team_${teamId}`, () => HLTV.getTeam({ id: teamId }));
        
        const coachObj = teamInfo.players.find((p: any) => p.type === 'Coach');
        const activePlayers = teamInfo.players
          .filter((p: any) => p.type !== 'Coach')
          .map((p: any) => ({ 
            id: p.name,
            name: p.fullname || p.name
          }));

        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              name: teamInfo.name,
              players: activePlayers,
              coach: coachObj ? coachObj.name : null,
              rank: teamInfo.rank
            }) 
          }] 
        };
      }

      if (name === "get_cs2_team_match_history") {
        const validated = GetCS2TeamMatchHistorySchema.parse(args);
        const teamId = validated.teamId;
        const teamInfo = await getCachedData(`team_${teamId}`, () => HLTV.getTeam({ id: teamId }));
        return { content: [{ type: "text", text: JSON.stringify(teamInfo.recentResults || []) }] };
      }

      if (name === "get_cs2_team_rankings") {
        const rankings = await getCachedData("rankings", () => HLTV.getTeamRanking());
        return { content: [{ type: "text", text: JSON.stringify(rankings.slice(0, 20)) }] };
      }

      if (name === "get_cs2_player_stats") {
        const validated = GetCS2PlayerStatsSchema.parse(args);
        const playerId = validated.playerId;
        const stats = await getCachedData(`player_${playerId}`, () => HLTV.getPlayerStats({ id: playerId }));
        return { content: [{ type: "text", text: JSON.stringify(stats) }] };
      }

      if (name === "get_cs2_map_performance") {
        const validated = GetCS2MapPerformanceSchema.parse(args);
        const teamId = validated.teamId;
        const stats = await getCachedData(`team_stats_${teamId}`, () => HLTV.getTeamStats({ id: teamId }));
        let mapStats = stats.mapStats;
        if (validated.mapName) {
          const targetMap = validated.mapName.toLowerCase();
          mapStats = Object.keys(mapStats)
            .filter(key => key.toLowerCase() === targetMap)
            .reduce((obj, key) => {
              obj[key] = mapStats[key];
              return obj;
            }, {} as any);
        }
        return { content: [{ type: "text", text: JSON.stringify(mapStats) }] };
      }

      if (name === "get_cs2_player_map_performance") {
        const validated = GetCS2PlayerMapPerformanceSchema.parse(args);
        const playerId = validated.playerId;
        const mapName = validated.mapName;
        const stats = await getCachedData(`player_map_${playerId}_${mapName}`, () => HLTV.getPlayerStats({ 
          id: playerId,
          maps: [mapName as any]
        }));
        return { content: [{ type: "text", text: JSON.stringify(stats) }] };
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
