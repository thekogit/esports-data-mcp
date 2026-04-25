import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getLiquipediaTournaments, getLiquipediaRoster, getLiquipediaMatchHistory } from './utils/liquipedia';
import { fetchJson, fetchAndSummarize } from './utils/fetcher';
import { parseHawkLiveMatch } from './utils/hawk_live';
import { searchEGWTeams, getEGWLiveMatches } from './utils/egamersworld';
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
        name: "get_dota2_team_match_history",
        description: "Get recent match history for a specific Dota 2 team from Liquipedia.",
        inputSchema: {
          type: "object",
          properties: {
            teamName: { type: "string", description: "Team name (e.g. 'Team Spirit')" }
          },
          required: ["teamName"]
        }
      },
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
      },
      {
        name: "search_dota2_egw_teams",
        description: "Search for Dota 2 teams on EGamersWorld (high accuracy for smaller/newer teams)",
        inputSchema: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"]
        }
      },
      {
        name: "get_dota2_egw_live_matches",
        description: "Get live Dota 2 matches from EGamersWorld",
        inputSchema: { type: "object", properties: {} }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};

  if (request.params.name === "get_dota2_team_match_history") {
    const teamName = args.teamName as string;
    const history = await getLiquipediaMatchHistory('dota2', teamName);
    return { content: [{ type: "text", text: JSON.stringify(history, null, 2) }] };
  }

  if (request.params.name === "search_dota2_egw_teams") {
    const teams = await searchEGWTeams('dota2', args.name as string);
    return { content: [{ type: "text", text: JSON.stringify(teams, null, 2) }] };
  }

  if (request.params.name === "get_dota2_egw_live_matches") {
    const matches = await getEGWLiveMatches('dota2');
    return { content: [{ type: "text", text: JSON.stringify(matches, null, 2) }] };
  }

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

    // Surgical Filtering to reduce token noise
    const cleanData = data.slice(0, 10).map((m: any) => ({
      match_id: m.match_id,
      team_radiant: m.team_name_radiant || "Unknown",
      team_dire: m.team_name_dire || "Unknown",
      score_radiant: m.radiant_score,
      score_dire: m.dire_score,
      game_time: Math.floor(m.game_time / 60) + ":" + (m.game_time % 60).toString().padStart(2, '0'),
      radiant_lead: m.radiant_lead,
      league_name: m.league_name,
      series_type: m.series_type === 1 ? "BO3" : (m.series_type === 2 ? "BO5" : "BO1")
    }));

    return { content: [{ type: "text", text: JSON.stringify(cleanData, null, 2) }] };
  }

  if (request.params.name === "parse_dota2_match_url") {
    const url = args.url as string;
    if (url.includes('hawk.live')) {
      const data = await parseHawkLiveMatch(url);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    
    if (url.includes('egamersworld.com')) {
      try {
        const summary = await fetchAndSummarize(url);
        return { 
          content: [{ 
            type: "text", 
            text: `Detailed parsing for egamersworld.com is in progress. Here is a summary of the match data:\n\n${summary}` 
          }] 
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error accessing egamersworld.com: ${error.message}\n\nNote: This site often blocks automated requests. You may need to provide the data manually or use hawk.live.`
          }]
        };
      }
    }
    
    // Fallback for other URLs (e.g. bo3)
    // Reduce noise by fetching a surgical summary
    try {
      const summary = await fetchAndSummarize(url);
      return { 
        content: [{ 
          type: "text", 
          text: `URL deep parsing not yet supported for this domain. Here is a surgical text summary of the page to help you extract the data manually:\n\n${summary}` 
        }] 
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error parsing match URL: ${error.message}\n\nPlease try using a supported live data source like https://hawk.live or https://liquipedia.net`
        }]
      };
    }
  }

  if (request.params.name === "get_dota2_team_info") {
    const data = await fetchJson(`https://api.opendota.com/api/teams/${args.teamId}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (request.params.name === "search_dota2_teams") {
    const name = (args.name as string).toLowerCase();
    
    // 1. Try OpenDota first (standard for IDs)
    const allTeams = await fetchJson(`https://api.opendota.com/api/teams`);
    
    let teams = allTeams.map((team: any) => ({
      ...team,
      score: Math.max(
        compareTwoStrings(name, (team.name || "").toLowerCase()),
        compareTwoStrings(name, (team.tag || "").toLowerCase())
      )
    }))
    .filter((team: any) => team.score > 0.4 || (team.name || "").toLowerCase().includes(name))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 10);

    // 2. Fallback to EGW if results are poor (for newer/niche teams like Vertex Pack)
    if (teams.length === 0 || teams[0].score < 0.7) {
      const egwTeams = await searchEGWTeams('dota2', args.name as string);
      if (egwTeams.length > 0) {
        // Map EGW results to a similar structure
        const enrichedEGW = egwTeams.map(t => ({
          name: t.name,
          egw_url: t.url,
          logo_url: t.logo,
          score: t.score,
          note: "Team found on EGamersWorld (high accuracy fallback)"
        }));
        
        // Merge results, prioritizing exact name matches from EGW
        return { content: [{ type: "text", text: JSON.stringify([...enrichedEGW, ...teams].slice(0, 10), null, 2) }] };
      }
    }

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
