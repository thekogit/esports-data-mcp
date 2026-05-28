import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import { fetchHtml } from './utils/fetcher';
import { getLiquipediaTournaments, getLiquipediaRoster } from './utils/liquipedia';
import * as cheerio from 'cheerio';
import { z } from "zod";

// Zod schemas for tool validation
const GetRivalsPlayerStatsSchema = z.object({
  username: z.string()
});

const GetRivalsTeamInfoSchema = z.object({
  teamName: z.string()
});

export function registerMarvelRivalsTools(server: Server) {
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
    const name = request.params.name;

    try {
      if (name === "get_rivals_player_stats") {
        const validated = GetRivalsPlayerStatsSchema.parse(args);
        // Using unofficial API or tracker scrape
        const { data } = await axios.get(`https://marvelrivalsapi.com/api/v1/player/${validated.username}`).catch(() => ({ data: "Rate limited or player not found" }));
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      }

      if (name === "get_rivals_counters_synergies") {
        const html = await fetchHtml('https://peakrivals.com/counters').catch(() => null);
        if (!html) return { content: [{ type: "text", text: "Data unavailable" }] };
        const $ = cheerio.load(html);
        const counters = $('.counter-card').map((i, el) => $(el).text().trim()).get();
        return { content: [{ type: "text", text: JSON.stringify(counters.slice(0, 10)) }] };
      }

      if (name === "get_rivals_tournaments") {
        const data = await getLiquipediaTournaments('marvelrivals');
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      }

      if (name === "get_rivals_team_info") {
        const validated = GetRivalsTeamInfoSchema.parse(args);
        const team = validated.teamName;
        const roster = await getLiquipediaRoster('marvelrivals', team.replace(/ /g, '_'));
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
