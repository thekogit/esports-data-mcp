import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export type GameContext = 'dota2' | 'cs2' | 'valo' | 'generic';

interface GameParameters {
  lambda: number; // Time decay
  temperature: number; // Boltzmann sharpening
  posWeights: Record<string | number, number>;
  biasCorrection: 'standard' | 'reverse' | 'none';
}

const GAME_PROFILES: Record<GameContext, GameParameters> = {
  dota2: { lambda: 0.96, temperature: 0.8, posWeights: { 1: 1.2, 2: 1.1, 3: 1.0, 4: 0.8, 5: 0.8 }, biasCorrection: 'reverse' },
  cs2: { lambda: 0.98, temperature: 1.1, posWeights: { 'IGL': 1.1, 'Entry': 1.1, 'AWPer': 1.05 }, biasCorrection: 'standard' },
  valo: { lambda: 0.92, temperature: 1.2, posWeights: { 'Duelist': 1.15, 'Initiator': 1.1, 'Controller': 1.0, 'Sentinel': 1.0 }, biasCorrection: 'none' },
  generic: { lambda: 0.95, temperature: 1.0, posWeights: {}, biasCorrection: 'none' }
};

export function identifyGameContext(playerImpacts: any[], context?: string): GameContext {
  const ctxLower = (context || '').toLowerCase();
  
  // 1. Context Keyword Check
  if (ctxLower.includes('dota') || ctxLower.includes('roshan')) return 'dota2';
  if (ctxLower.includes('valorant') || ctxLower.includes('spike')) return 'valo';
  if (ctxLower.includes('cs2') || ctxLower.includes('hltv')) return 'cs2';
  if (ctxLower.includes('league') || ctxLower.includes('nexus')) return 'dota2'; // Defaulting LoL to Dota profile for now as they share MOBA logic

  if (!playerImpacts || playerImpacts.length === 0) return 'generic';
  
  // 2. Position Check (Robust)
  if (playerImpacts.some(p => typeof p.position === 'number' && [1, 2, 3, 4, 5].includes(p.position))) return 'dota2';
  
  // 3. Role Check
  const roles = playerImpacts.map(p => (p.role || '').toLowerCase());
  if (roles.some(r => ['duelist', 'initiator', 'sentinel', 'controller'].includes(r))) return 'valo';
  if (roles.some(r => ['igl', 'awper', 'entry', 'lurker'].includes(r))) return 'cs2';
  if (roles.some(r => ['carry', 'mid', 'jungler', 'support'].includes(r))) return 'dota2';
  
  return 'generic';
}

const server = new Server(
  { name: "analysis-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_fair_odds",
        description: "Calculates the true probability of winning based on Elo, Draft Advantage, and Action2Score historical impact metrics.",
        inputSchema: {
          type: "object",
          properties: {
            teamAElo: { type: "number", description: "Elo rating of Team A" },
            teamBElo: { type: "number", description: "Elo rating of Team B" },
            teamADraftAdvantage: { type: "number", description: "Draft synergy/counter advantage for Team A (-0.1 to 0.1)" },
            teamBActionScore: { type: "number", description: "Recent average action impact score of Team B vs Team A" }
          },
          required: ["teamAElo", "teamBElo"]
        }
      },
      {
        name: "get_edge_analysis",
        description: "Compares fair odds against bookmaker odds to find Expected Value (+EV) opportunities.",
        inputSchema: {
          type: "object",
          properties: {
            fairProbability: { type: "number", description: "Your model's true probability (0.0 to 1.0)" },
            bookmakerDecimalOdds: { type: "number", description: "The decimal odds offered by the bookmaker (e.g. 1.90)" }
          },
          required: ["fairProbability", "bookmakerDecimalOdds"]
        }
      },
      {
        name: "calculate_kelly_wager",
        description: "Calculates the optimal bet size using the Kelly Criterion to maximize logarithmic wealth growth.",
        inputSchema: {
          type: "object",
          properties: {
            winProbability: { type: "number", description: "Probability of winning the bet (0.0 to 1.0)" },
            decimalOdds: { type: "number", description: "Decimal odds of the bet" },
            bankroll: { type: "number", description: "Total available bankroll" },
            fraction: { type: "number", description: "Kelly fraction multiplier (e.g. 0.5 for Half-Kelly to reduce variance)", default: 0.5 }
          },
          required: ["winProbability", "decimalOdds", "bankroll"]
        }
      },
      {
        name: "get_team_momentum",
        description: "Calculates a psychological momentum multiplier based on recent clutch wins or tilting losses.",
        inputSchema: {
          type: "object",
          properties: {
            recentWinStreak: { type: "number", description: "Number of consecutive wins" },
            recentClutchRounds: { type: "number", description: "Number of highly improbable rounds won recently" },
            recentThrows: { type: "number", description: "Number of highly probable rounds lost recently" }
          },
          required: ["recentWinStreak", "recentClutchRounds", "recentThrows"]
        }
      },
      {
        name: "get_optimal_bet_strategy",
        description: "Calculates the best bet possible synthesizing all research (Elo, Draft, Action2Score, Momentum, Kelly Criterion) to provide a comprehensive betting recommendation.",
        inputSchema: {
          type: "object",
          properties: {
            teamAElo: { type: "number" },
            teamBElo: { type: "number" },
            teamADraftAdvantage: { type: "number", description: "Draft synergy/counter advantage for Team A (-0.1 to 0.1)" },
            teamBActionScore: { type: "number", description: "Recent average action impact score of Team B vs Team A" },
            playerImpacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  impact: { type: "number", description: "The impact score for the player" },
                  position: { type: "number", enum: [1, 2, 3, 4, 5], description: "The player's position (1=Carry, 2=Mid, 3=Offlane, 4=Soft Support, 5=Hard Support)" }
                },
                required: ["impact", "position"]
              }
            },
            teamAMomentum: { type: "number", description: "Momentum multiplier for Team A (e.g. 1.05)" },
            teamBMomentum: { type: "number", description: "Momentum multiplier for Team B (e.g. 0.95)" },
            bookmakerOddsTeamA: { type: "number", description: "Decimal odds for Team A" },
            bookmakerOddsTeamB: { type: "number", description: "Decimal odds for Team B" },
            polymarketProbabilityTeamA: { type: "number", description: "Market implied probability from Polymarket (0.0 to 1.0)" },
            bankroll: { type: "number" }
          },
          required: ["teamAElo", "teamBElo", "bookmakerOddsTeamA", "bookmakerOddsTeamB", "bankroll"]
        }
      },
      {
        name: "calculate_boltzmann_probs",
        description: "Sharpens market odds using the Boltzmann distribution to correct for favorite-longshot bias.",
        inputSchema: {
          type: "object",
          properties: {
            oddsHome: { type: "number" },
            oddsAway: { type: "number" },
            oddsDraw: { type: "number" }
          },
          required: ["oddsHome", "oddsAway"]
        }
      },
      {
        name: "calculate_bayesian_dirichlet",
        description: "Updates market priors with historical evidence using a Bayesian Dirichlet posterior calculation.",
        inputSchema: {
          type: "object",
          properties: {
            boltzmannProbs: {
              type: "object",
              properties: {
                home: { type: "number" },
                away: { type: "number" },
                draw: { type: "number" }
              },
              required: ["home", "away"]
            },
            historicalCounts: {
              type: "object",
              properties: {
                homeWins: { type: "number" },
                awayWins: { type: "number" },
                draws: { type: "number" }
              },
              required: ["homeWins", "awayWins"]
            }
          },
          required: ["boltzmannProbs", "historicalCounts"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};

  if (request.params.name === "get_fair_odds") {
    const eloA = args.teamAElo as number;
    const eloB = args.teamBElo as number;
    const draftAdv = (args.teamADraftAdvantage as number) || 0;
    
    // Base Elo Probability
    let probA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    
    // Adjust for Draft Advantage
    probA += draftAdv;
    
    // Normalize
    probA = Math.max(0.01, Math.min(0.99, probA));
    const probB = 1 - probA;
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          teamA_win_probability: (probA * 100).toFixed(2) + "%",
          teamB_win_probability: (probB * 100).toFixed(2) + "%",
          teamA_fair_decimal_odds: (1 / probA).toFixed(3),
          teamB_fair_decimal_odds: (1 / probB).toFixed(3)
        }, null, 2) 
      }] 
    };
  }

  if (request.params.name === "get_edge_analysis") {
    const p = args.fairProbability as number;
    const odds = args.bookmakerDecimalOdds as number;
    const impliedProb = 1 / odds;
    
    const ev = (p * odds) - 1;
    const edge = p - impliedProb;
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          expected_value: (ev * 100).toFixed(2) + "%",
          probability_edge: (edge * 100).toFixed(2) + "%",
          is_value_bet: ev > 0,
          recommendation: ev > 0.05 ? "Strong Value" : (ev > 0 ? "Marginal Value" : "No Value (Avoid)")
        }, null, 2) 
      }] 
    };
  }

  if (request.params.name === "calculate_kelly_wager") {
    const p = args.winProbability as number;
    const decimalOdds = args.decimalOdds as number;
    const bankroll = args.bankroll as number;
    const fraction = (args.fraction as number) || 0.5; // Default half-kelly

    if (decimalOdds <= 1.0) {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            optimal_kelly_percentage: "0.00%",
            adjusted_kelly_percentage: "0.00%",
            recommended_wager_amount: "0.00",
            bankroll_remaining: bankroll.toFixed(2),
            note: "Odds must be greater than 1.0 for Kelly Criterion."
          }, null, 2) 
        }] 
      };
    }

    const b = decimalOdds - 1; // b is net odds
    const q = 1 - p;
    
    const kellyPct = (p * b - q) / b;
    const adjustedKellyPct = Math.max(0, kellyPct * fraction);
    const recommendedWager = bankroll * adjustedKellyPct;
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          optimal_kelly_percentage: (kellyPct * 100).toFixed(2) + "%",
          adjusted_kelly_percentage: (adjustedKellyPct * 100).toFixed(2) + "%",
          recommended_wager_amount: recommendedWager.toFixed(2),
          bankroll_remaining: (bankroll - recommendedWager).toFixed(2)
        }, null, 2) 
      }] 
    };
  }

  if (request.params.name === "get_team_momentum") {
    const streak = args.recentWinStreak as number;
    const clutches = args.recentClutchRounds as number;
    const throws = args.recentThrows as number;
    
    // Formula based on Scalable Psychological Momentum Forecasting
    let momentumScore = 1.0;
    momentumScore += (streak * 0.02); // 2% boost per win streak
    momentumScore += (clutches * 0.05); // 5% boost per clutch
    momentumScore -= (throws * 0.08); // 8% penalty per throw (tilting is stronger than clutching)
    
    momentumScore = Math.max(0.1, momentumScore);
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          momentum_multiplier: momentumScore.toFixed(3),
          psychological_state: momentumScore > 1.1 ? "On Fire" : (momentumScore < 0.9 ? "Tilted" : "Stable")
        }, null, 2) 
      }] 
    };
  }

  if (request.params.name === "get_optimal_bet_strategy") {
    const eloA = args.teamAElo as number;
    const eloB = args.teamBElo as number;
    const draftAdv = (args.teamADraftAdvantage as number) || 0;
    const actionScoreB = (args.teamBActionScore as number) || 0;
    const playerImpacts = args.playerImpacts as { impact: number; position: number }[] | undefined;
    const momentumA = Math.max(0.1, (args.teamAMomentum as number) ?? 1.0);
    const momentumB = Math.max(0.1, (args.teamBMomentum as number) ?? 1.0);
    const oddsA = args.bookmakerOddsTeamA as number;
    const oddsB = args.bookmakerOddsTeamB as number;
    const bankroll = args.bankroll as number;
    const polymarketProbA = args.polymarketProbabilityTeamA as number | undefined;

    // 1. Calculate Fair Probability (Elo + Draft + ActionScore)
    const weightMap: Record<number, number> = { 1: 1.2, 2: 1.1, 3: 1.0, 4: 0.8, 5: 0.8 };
    
    let probA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    probA += draftAdv;
    
    if (playerImpacts && playerImpacts.length > 0) {
      const totalImpactAdj = playerImpacts.reduce((sum, p) => sum + (p.impact * (weightMap[p.position] || 1.0)), 0);
      probA += (totalImpactAdj * 0.05);
    } else {
      // Action2Score adjustment fallback (if B has a high action score, A's win probability goes down slightly)
      probA -= (actionScoreB * 0.05);
    }
    
    // 2. Apply Psychological Momentum (Scalable Psychological Momentum Forecasting)
    // Adjust odds based on relative momentum
    probA = probA * (momentumA / momentumB);
    
    // Normalize
    probA = Math.max(0.01, Math.min(0.99, probA));
    const probB = 1 - probA;

    // 3. Compare with Bookmaker (A Computational View of Market Efficiency)
    const impliedProbA = 1 / oddsA;
    const impliedProbB = 1 / oddsB;
    const evA = (probA * oddsA) - 1;
    const evB = (probB * oddsB) - 1;

    // 4. Determine best bet
    let bestTeam = "None";
    let edge = 0;
    let ev = 0;
    let odds = 0;
    let prob = 0;

    if (evA > 0 && evA > evB) {
      bestTeam = "Team A";
      edge = probA - impliedProbA;
      ev = evA;
      odds = oddsA;
      prob = probA;
    } else if (evB > 0 && evB > evA) {
      bestTeam = "Team B";
      edge = probB - impliedProbB;
      ev = evB;
      odds = oddsB;
      prob = probB;
    }

    // 5. Calculate Kelly Wager (Application of the Kelly Criterion to Prediction Markets)
    let recommendedWager = 0;
    let kellyPct = 0;
    let recommendation = "No Value Bet - Skip";

    if (bestTeam !== "None") {
      if (odds > 1.0) {
        const b = odds - 1;
        const q = 1 - prob;
        kellyPct = (prob * b - q) / b;
        
        // Use Fractional Kelly (1/4 Kelly) to adjust for Overinference/Underinference risks noted in literature
        const fractionalKelly = kellyPct * 0.25; 
        recommendedWager = Math.max(0, bankroll * fractionalKelly);
      } else {
        kellyPct = 0;
        recommendedWager = 0;
      }
      
      recommendation = ev > 0.10 ? "Strong Value Bet" : "Marginal Value Bet";
    }

    // 6. Polymarket Consensus Logic
    let marketValidation = "No Market Data";
    let evMarket: number | undefined = undefined;

    if (polymarketProbA !== undefined && bestTeam !== "None") {
      marketValidation = "Neutral";
      const modelProb = bestTeam === "Team A" ? probA : probB;
      const marketProb = bestTeam === "Team A" ? polymarketProbA : (1 - polymarketProbA);
      const impliedBookieProb = bestTeam === "Team A" ? impliedProbA : impliedProbB;

      const marketEdge = marketProb - impliedBookieProb;

      // EV relative to the market (how much better/worse our model is than the crowd)
      evMarket = marketProb > 0 ? (modelProb / marketProb) - 1 : 0;

      if (marketEdge > 0) {
        marketValidation = "Confirmed";
        if (recommendation === "Strong Value Bet") recommendation = "Confirmed Strong Value Bet";
      } else if (marketEdge < 0) {
        marketValidation = "Divergent";
      }

      if (Math.abs(modelProb - marketProb) > 0.20) {
        marketValidation = "High Divergence";
        recommendation = "High Divergence - Exercise Caution";
      }
    }

    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          analysis_summary: {
            teamA_true_prob: (probA * 100).toFixed(2) + "%",
            teamB_true_prob: (probB * 100).toFixed(2) + "%",
            teamA_EV: (evA * 100).toFixed(2) + "%",
            teamB_EV: (evB * 100).toFixed(2) + "%",
            polymarket_implied_prob: polymarketProbA !== undefined ? (polymarketProbA * 100).toFixed(2) + "%" : "N/A",
            ev_market: evMarket !== undefined ? (evMarket * 100).toFixed(2) + "%" : "N/A"
          },
          optimal_bet: {
            target: bestTeam,
            rationale: recommendation,
            market_validation: marketValidation,
            probability_edge: (edge * 100).toFixed(2) + "%",
            expected_value: (ev * 100).toFixed(2) + "%",
            recommended_wager_amount: recommendedWager.toFixed(2),
            kelly_fraction_used: "Quarter-Kelly (0.25) to account for model variance and overinference"
          }
        }, null, 2) 
      }] 
    };
  }

  if (request.params.name === "calculate_boltzmann_probs") {
    const oddsHome = args.oddsHome as number;
    const oddsAway = args.oddsAway as number;
    const oddsDraw = args.oddsDraw as number | undefined;

    const eH = oddsHome / oddsAway;
    const eA = oddsAway / oddsHome;
    const eD = oddsDraw;

    const pH_un = Math.exp(-eH);
    const pA_un = Math.exp(-eA);
    const pD_un = eD !== undefined ? Math.exp(-eD) : 0;

    const Z = pH_un + pA_un + pD_un;

    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          home_prob: (pH_un / Z).toFixed(4),
          away_prob: (pA_un / Z).toFixed(4),
          draw_prob: (pD_un / Z).toFixed(4)
        }, null, 2) 
      }] 
    };
  }

  if (request.params.name === "calculate_bayesian_dirichlet") {
    const boltzmannProbs = args.boltzmannProbs as { home: number; away: number; draw?: number };
    const historicalCounts = args.historicalCounts as { homeWins: number; awayWins: number; draws?: number };

    const homeWins = historicalCounts.homeWins;
    const awayWins = historicalCounts.awayWins;
    const draws = historicalCounts.draws || 0;

    // Calculate Prior Strength S
    const S = Math.round(homeWins + awayWins + draws);

    // Calculate Alpha Parameters
    const alphaH = boltzmannProbs.home * S;
    const alphaA = boltzmannProbs.away * S;
    const alphaD = (boltzmannProbs.draw || 0) * S;

    // Calculate Totals
    const totalAlpha = alphaH + alphaA + alphaD;
    const totalCount = homeWins + awayWins + draws;

    // Calculate Posterior Probabilities
    const posteriorHome = (homeWins + alphaH) / (totalCount + totalAlpha);
    const posteriorAway = (awayWins + alphaA) / (totalCount + totalAlpha);
    const posteriorDraw = (draws + alphaD) / (totalCount + totalAlpha);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          posterior_home: posteriorHome.toFixed(4),
          posterior_away: posteriorAway.toFixed(4),
          posterior_draw: posteriorDraw.toFixed(4),
          prior_strength: S
        }, null, 2)
      }]
    };
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Probability Analysis MCP Server running");
}

if (process.env.NODE_ENV !== 'test') {
  main().catch(console.error);
}
