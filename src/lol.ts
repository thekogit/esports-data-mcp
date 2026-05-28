import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fetchHtml } from './utils/fetcher';
import { searchEGWTeams, getEGWLiveMatches } from './utils/egamersworld';
import { getLiquipediaTournaments, getLiquipediaRoster } from './utils/liquipedia';
import * as cheerio from 'cheerio';
import { z } from "zod";

// Zod schemas for tool validation
const GetLolTeamInfoSchema = z.object({
  teamName: z.string()
});

const GetLolPlayerInfoSchema = z.object({
  playerName: z.string()
});

const GetLolCountersSchema = z.object({
  championName: z.string()
});

const GetLolGolTeamStatsSchema = z.object({
  teamName: z.string()
});

const SearchLolEGWTeamsSchema = z.object({
  name: z.string()
});

export function registerLolTools(server: Server) {
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
        },
        {
          name: "get_lol_gol_team_stats",
          description: "Get advanced team stats from Games of Legends (gol.gg) for better analytical data.",
          inputSchema: {
            type: "object",
            properties: { teamName: { type: "string" } },
            required: ["teamName"]
          }
        },
        {
          name: "search_lol_egw_teams",
          description: "Search for League of Legends teams on EGamersWorld (high accuracy for smaller/newer teams)",
          inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"]
          }
        },
        {
          name: "get_lol_egw_live_matches",
          description: "Get live League of Legends matches from EGamersWorld",
          inputSchema: { type: "object", properties: {} }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments || {};
    const name = request.params.name;

    try {
      if (name === "search_lol_egw_teams") {
        const validated = SearchLolEGWTeamsSchema.parse(args);
        const teams = await searchEGWTeams('league-of-legends', validated.name);
        return { content: [{ type: "text", text: JSON.stringify(teams) }] };
      }

      if (name === "get_lol_egw_live_matches") {
        const matches = await getEGWLiveMatches('league-of-legends');
        return { content: [{ type: "text", text: JSON.stringify(matches) }] };
      }

      if (name === "get_lol_tournaments") {
        const data = await getLiquipediaTournaments('leagueoflegends');
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      }
      
      if (name === "get_lol_team_info") {
        const validated = GetLolTeamInfoSchema.parse(args);
        const team = validated.teamName;
        const roster = await getLiquipediaRoster('leagueoflegends', team.replace(/ /g, '_'));
        return { content: [{ type: "text", text: JSON.stringify(roster) }] };
      }

      if (name === "get_lol_player_info") {
        const validated = GetLolPlayerInfoSchema.parse(args);
        const player = validated.playerName;
        const html = await fetchHtml(`https://liquipedia.net/leagueoflegends/${player}`);
        const $ = cheerio.load(html);
        const info: any = {
          name: $('.infobox-header').first().text().trim(),
          teams: $('.infobox-cell-2').text().trim(),
          history: $('.wikitable-tournament-results').text().trim(), // basic scrape
        };
        return { content: [{ type: "text", text: JSON.stringify(info) }] };
      }

      if (name === "get_lol_counters") {
        const validated = GetLolCountersSchema.parse(args);
        const champ = validated.championName.toLowerCase();
        const html = await fetchHtml(`https://op.gg/champions/${champ}/counters`).catch(() => null);
        if (!html) return { content: [{ type: "text", text: "Failed to fetch data" }] };
        
        const $ = cheerio.load(html);
        const counters: string[] = [];
        $('.champion-box .name').each((i, el) => {
          counters.push($(el).text().trim());
        });
        return { content: [{ type: "text", text: JSON.stringify(counters) }] };
      }

      if (name === "get_lol_matches") {
        const url = "https://liquipedia.net/leagueoflegends/Liquipedia:Upcoming_and_ongoing_matches";
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);
        const matches: any[] = [];
        
        $('.infobox_matches_content').each((i, el) => {
          if (matches.length >= 15) return;
          
          const team1 = $(el).find('.team-left').text().trim();
          const team2 = $(el).find('.team-right').text().trim();
          const time = $(el).find('.timer-object').text().trim();
          const tournament = $(el).find('.match-filler').text().trim();
          
          if (team1 && team2) {
            matches.push({
              teams: `${team1} vs ${team2}`,
              team1,
              team2,
              tournament,
              time: time || "TBD"
            });
          }
        });
        
        return { content: [{ type: "text", text: JSON.stringify(matches) }] };
      }

      if (name === "get_lol_gol_team_stats") {
        const validated = GetLolGolTeamStatsSchema.parse(args);
        const teamNameInput = validated.teamName;
        // Basic search on gol.gg
        const url = `https://gol.gg/teams/list/season-S14/split-ALL/region-ALL/`;
        const html = await fetchHtml(url).catch(() => null);
        if (!html) return { content: [{ type: "text", text: "Failed to fetch data from gol.gg" }] };
        const $ = cheerio.load(html);
        let stats: any = { error: "Team not found in current season list" };
        
        $('table.table_list tbody tr').each((i, el) => {
          const nameTable = $(el).find('td').eq(0).text().trim();
          if (nameTable.toLowerCase().includes(teamNameInput.toLowerCase())) {
            stats = {
              name: nameTable,
              region: $(el).find('td').eq(1).text().trim(),
              winRate: $(el).find('td').eq(3).text().trim(),
              kda: $(el).find('td').eq(4).text().trim(),
              goldPerMinute: $(el).find('td').eq(5).text().trim(),
              averageGameDuration: $(el).find('td').eq(8).text().trim(),
              firstTowerPercent: $(el).find('td').eq(11).text().trim(),
              firstDragonPercent: $(el).find('td').eq(12).text().trim(),
            };
          }
        });

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
