import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getLiquipediaTournaments, getLiquipediaRoster } from './utils/liquipedia';
import { fetchJson } from './utils/fetcher';
import { parseHawkLiveMatch } from './utils/hawk_live';
import { compareTwoStrings } from 'string-similarity';
import { solvePositions, POSITION_MAP } from './utils/dota2_roles';

const server = new Server(
  { name: "dota2-mcp", version: "1.2.0" },
  { capabilities: { tools: {} } }
);

interface Hero {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  attack_type: string;
  roles: string[];
}

let heroCache: Hero[] | null = null;

async function getHeroes(): Promise<Hero[]> {
  if (heroCache) return heroCache;
  heroCache = await fetchJson('https://api.opendota.com/api/heroes');
  return heroCache || [];
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_dota2_heroes",
        description: "List all Dota 2 heroes with their IDs and names. Use this to map hero names to IDs.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_dota2_leagues",
        description: "List all active leagues and tournaments from Liquipedia",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_dota2_live_matches",
        description: "Get real-time scores and in-game stats for pro matches. Can be filtered by team name.",
        inputSchema: { 
          type: "object", 
          properties: {
            teamName: { type: "string", description: "Filter by team name (e.g. 'MOUZ')" }
          }
        }
      },
      {
        name: "parse_dota2_match_url",
        description: "Parses a Hawk Live or Liquipedia match URL to get live game state, score, and drafts.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The match URL (e.g. from hawk.live)" }
          },
          required: ["url"]
        }
      },
      {
        name: "get_dota2_team_info",
        description: "Get detailed pro team info and history",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "number" } },
          required: ["teamId"]
        }
      },
      {
        name: "search_dota2_teams",
        description: "Search for a pro team by name to find their teamId and rating.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Team name to search for (e.g. 'Team Spirit')" }
          },
          required: ["name"]
        }
      },
      {
        name: "get_dota2_hero_matchups",
        description: "Get hero matchups and counters. Returns win rates against other heroes.",
        inputSchema: {
          type: "object",
          properties: { 
            heroId: { type: "number", description: "Hero ID to check matchups for" }
          },
          required: ["heroId"]
        }
      },
      {
        name: "analyze_dota2_draft",
        description: "Analyzes two teams of heroes to determine draft advantage. Uses head-to-head win rates.",
        inputSchema: {
          type: "object",
          properties: {
            radiantHeroIds: { type: "array", items: { type: "number" }, minItems: 1, maxItems: 5 },
            direHeroIds: { type: "array", items: { type: "number" }, minItems: 1, maxItems: 5 }
          },
          required: ["radiantHeroIds", "direHeroIds"]
        }
      },
      {
        name: "identify_dota2_roles",
        description: "Given a list of 5 hero IDs or names for a team, identifies their most likely positions (1-5) and roles.",
        inputSchema: {
          type: "object",
          properties: {
            heroes: { 
              type: "array", 
              items: { type: "string" }, 
              minItems: 5, 
              maxItems: 5,
              description: "List of 5 hero names (e.g. ['Faceless Void', 'Techies', ...])" 
            }
          },
          required: ["heroes"]
        }
      },
      {
        name: "get_dota2_team_roster",
        description: "Get the current team roster including players and coach. Uses team name.",
        inputSchema: {
          type: "object",
          properties: {
            teamName: { type: "string", description: "Team name (e.g. 'Team Spirit')" }
          },
          required: ["teamName"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};

  if (request.params.name === "get_dota2_heroes") {
    const heroes = await getHeroes();
    return { content: [{ type: "text", text: JSON.stringify(heroes, null, 2) }] };
  }

  if (request.params.name === "get_dota2_leagues") {
    const data = await getLiquipediaTournaments('dota2');
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (request.params.name === "get_dota2_live_matches") {
    let data = await fetchJson('https://api.opendota.com/api/live');
    if (args.teamName) {
      const search = (args.teamName as string).toLowerCase();
      data = data.filter((m: any) => 
        (m.team_name_radiant || "").toLowerCase().includes(search) || 
        (m.team_name_dire || "").toLowerCase().includes(search)
      );
    }
    return { content: [{ type: "text", text: JSON.stringify(data.slice(0, 10), null, 2) }] };
  }

  if (request.params.name === "parse_dota2_match_url") {
    const url = args.url as string;
    if (url.includes('hawk.live')) {
      const data = await parseHawkLiveMatch(url);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    return { content: [{ type: "text", text: "Currently only hawk.live URLs are supported for deep parsing." }] };
  }

  if (request.params.name === "get_dota2_team_info") {
    const data = await fetchJson(`https://api.opendota.com/api/teams/${args.teamId}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (request.params.name === "search_dota2_teams") {
    const name = (args.name as string).toLowerCase();
    const allTeams = await fetchJson(`https://api.opendota.com/api/teams`);
    
    const teams = allTeams.map((team: any) => ({
      ...team,
      score: Math.max(
        compareTwoStrings(name, (team.name || "").toLowerCase()),
        compareTwoStrings(name, (team.tag || "").toLowerCase())
      )
    }))
    .filter((team: any) => team.score > 0.3 || (team.name || "").toLowerCase().includes(name))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 10);

    return { content: [{ type: "text", text: JSON.stringify(teams, null, 2) }] };
  }

  if (request.params.name === "get_dota2_hero_matchups") {
    const heroId = args.heroId as number;
    const [matchups, heroes] = await Promise.all([
      fetchJson(`https://api.opendota.com/api/heroes/${heroId}/matchups`),
      getHeroes()
    ]);
    
    // Enrich with localized names
    const enriched = matchups.map((m: any) => ({
      ...m,
      hero_name: heroes.find(h => h.id === m.hero_id)?.localized_name || "Unknown"
    })).slice(0, 20);

    return { content: [{ type: "text", text: JSON.stringify(enriched, null, 2) }] };
  }

  if (request.params.name === "analyze_dota2_draft") {
    const radiantIds = args.radiantHeroIds as number[];
    const direIds = args.direHeroIds as number[];
    const heroes = await getHeroes();

    const results = [];
    let totalRadiantAdvantage = 0;

    for (const rId of radiantIds) {
      const rMatchups = await fetchJson(`https://api.opendota.com/api/heroes/${rId}/matchups`);
      const rName = heroes.find(h => h.id === rId)?.localized_name || `Hero ${rId}`;
      
      for (const dId of direIds) {
        const matchup = rMatchups.find((m: any) => m.hero_id === dId);
        if (matchup) {
          const dName = heroes.find(h => h.id === dId)?.localized_name || `Hero ${dId}`;
          const winRate = matchup.wins / matchup.games_played;
          const advantage = winRate - 0.5;
          totalRadiantAdvantage += advantage;
          
          results.push({
            radiant_hero: rName,
            dire_hero: dName,
            radiant_win_rate: (winRate * 100).toFixed(2) + "%",
            advantage: (advantage * 100).toFixed(2) + "%"
          });
        }
      }
    }

    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          matchups: results,
          overall_radiant_advantage: (totalRadiantAdvantage * 100).toFixed(2) + "%",
          recommendation: totalRadiantAdvantage > 0 ? "Radiant Draft Advantage" : "Dire Draft Advantage"
        }, null, 2) 
      }] 
    };
  }

  if (request.params.name === "identify_dota2_roles") {
    const heroNames = args.heroes as string[];
    const allHeroes = await getHeroes();
    
    const teamHeroes = heroNames.map(name => {
      const h = allHeroes.find(ah => ah.localized_name.toLowerCase() === name.toLowerCase());
      return h || { id: 0, localized_name: name, roles: [] } as any;
    });

    const solved = solvePositions(teamHeroes as any);
    
    const results = heroNames.map(name => {
      const pos = solved[name] || 0;
      return {
        hero: name,
        position: pos,
        role: pos ? POSITION_MAP[pos] || "Unknown" : "Unknown"
      };
    }).sort((a, b) => a.position - b.position);

    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }

  if (request.params.name === "get_dota2_team_roster") {
    const teamName = args.teamName as string;
    // Replace spaces with underscores for Liquipedia URLs
    const roster = await getLiquipediaRoster('dota2', teamName.replace(/ /g, '_'));
    return { content: [{ type: "text", text: JSON.stringify(roster, null, 2) }] };
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dota 2 MCP Server running");
}

main().catch(console.error);
