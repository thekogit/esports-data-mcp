import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fetchHtml } from './utils/fetcher';
import { getLiquipediaTournaments, getLiquipediaRoster } from './utils/liquipedia';
import * as cheerio from 'cheerio';
import { z } from "zod";

// Zod schemas for tool validation
const GetOwPlayerStatsSchema = z.object({
  battletag: z.string()
});

const GetOwTeamInfoSchema = z.object({
  teamName: z.string()
});

export function registerOverwatchTools(server: Server) {
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
    const name = request.params.name;

    try {
      if (name === "get_ow_player_stats") {
        const validated = GetOwPlayerStatsSchema.parse(args);
        const tag = validated.battletag.replace('#', '-');
        const html = await fetchHtml(`https://www.overbuff.com/players/${tag}`).catch(() => null);
        if (!html) return { content: [{ type: "text", text: "Profile private or not found" }] };
        const $ = cheerio.load(html);
        const stats = $('.stats-container').text().trim();
        return { content: [{ type: "text", text: JSON.stringify({ stats }) }] };
      }

      if (name === "get_ow_tournaments") {
        const data = await getLiquipediaTournaments('overwatch');
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      }

      if (name === "get_ow_live_matches") {
        const html = await fetchHtml('https://liquipedia.net/overwatch/Liquipedia:Upcoming_and_ongoing_matches').catch(() => null);
        if (!html) return { content: [{ type: "text", text: "Matches unavailable" }] };
        const $ = cheerio.load(html);
        const matches: any[] = [];
        $('.infobox_matches_content').each((i, el) => {
           matches.push($(el).text().trim());
        });
        return { content: [{ type: "text", text: JSON.stringify(matches.slice(0, 10)) }] };
      }

      if (name === "get_ow_team_info") {
        const validated = GetOwTeamInfoSchema.parse(args);
        const team = validated.teamName;
        const roster = await getLiquipediaRoster('overwatch', team.replace(/ /g, '_'));
        return { content: [{ type: "text", text: JSON.stringify(roster) }] };
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
