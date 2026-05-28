import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { analyzeMatch } from './tools/orchestrator';
import { z } from "zod";

export type GameContext = 'dota2' | 'cs2' | 'valo' | 'generic';

// Zod schemas for tool validation
const GetFairOddsSchema = z.object({
  teamAElo: z.number(),
  teamBElo: z.number(),
  teamADraftAdvantage: z.number().optional(),
  teamBActionScore: z.number().optional(),
});

const GetEdgeAnalysisSchema = z.object({
  fairProbability: z.number(),
  bookmakerDecimalOdds: z.number(),
});

const CalculateKellyWagerSchema = z.object({
  winProbability: z.number(),
  decimalOdds: z.number(),
  bankroll: z.number(),
  fraction: z.number().optional(),
});

const GetTeamMomentumSchema = z.object({
  recentWinStreak: z.number(),
  recentClutchRounds: z.number(),
  recentThrows: z.number(),
});

const GetOptimalBetStrategySchema = z.object({
  teamAElo: z.number(),
  teamBElo: z.number(),
  teamADraftAdvantage: z.number().optional(),
  teamBActionScore: z.number().optional(),
  playerImpacts: z.array(z.object({
    impact: z.number(),
    position: z.number().optional(),
  })).optional(),
  teamAMomentum: z.number().optional(),
  teamBMomentum: z.number().optional(),
  bookmakerOddsTeamA: z.number(),
  bookmakerOddsTeamB: z.number(),
  polymarketProbabilityTeamA: z.number().optional(),
  bankroll: z.number(),
});

const CalculateBoltzmannProbsSchema = z.object({
  oddsA: z.number(),
  oddsB: z.number(),
  oddsDraw: z.number().optional(),
});

const CalculateBayesianDirichletSchema = z.object({
  boltzmannProbs: z.object({
    teamA: z.number(),
    teamB: z.number(),
    draw: z.number().optional(),
  }),
  historicalCounts: z.object({
    teamAWins: z.number(),
    teamBWins: z.number(),
    draws: z.number().optional(),
  }),
});

const AnalyzeMatchBayesianSchema = z.object({
  teamA: z.string(),
  teamB: z.string(),
  odds: z.object({
    teamA: z.number(),
    teamB: z.number(),
    draw: z.number().optional(),
  }),
  playerImpacts: z.array(z.object({
    player: z.string().optional(),
    impact: z.number(),
    position: z.number().optional(),
    role: z.string().optional(),
  })),
  historicalResults: z.array(z.object({
    winner: z.enum(["teamA", "teamB", "draw"]),
    date: z.string(),
    score: z.string().optional(),
  })),
  context: z.string().optional(),
  marketData: z.object({
    polymarketProb: z.number().optional(),
    exchangeOdds: z.number().optional(),
  }).optional(),
  bankroll: z.number().optional(),
});

const AnalyzeMatchSchema = z.object({
  matchUrl: z.string(),
  game: z.enum(["dota2", "cs2", "lol", "valo"]),
  bankroll: z.number().optional(),
});

export interface PlayerImpact {
  impact: number;
  position?: number;
  role?: string;
}

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

/**
 * Identifies the game context using keyword heuristics from strings 
 * and structural analysis of player roles/positions.
 * 
 * @param playerImpacts Array of player performance and role data
 * @param context Optional string context (e.g. tournament name, game title)
 * @returns Detected GameContext
 */
export function identifyGameContext(playerImpacts: PlayerImpact[], context?: string): GameContext {
  const ctxLower = (context || '').toLowerCase();
  
  // 1. Context Keyword Check
  if (ctxLower.includes('dota') || ctxLower.includes('roshan')) return 'dota2';
  if (ctxLower.includes('valorant') || ctxLower.includes('spike')) return 'valo';
  if (ctxLower.includes('cs2') || ctxLower.includes('hltv')) return 'cs2';
  if (ctxLower.includes('league') || ctxLower.includes('nexus')) return 'dota2'; // TODO: Add dedicated LoL profile if MOBA parameters diverge from Dota 2

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

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function calculateMatchProbabilities(
  context: GameContext,
  odds: { teamA: number; teamB: number; draw?: number },
  playerImpacts: PlayerImpact[],
  history: any[],
  elo?: { a: number, b: number }
) {
  const profile = GAME_PROFILES[context];
  
  // 1. Baseline Probability (Elo-based if available, else Market-based)
  let baseProbA: number;
  if (elo) {
    baseProbA = 1 / (1 + Math.pow(10, (elo.b - elo.a) / 400));
  } else {
    const eA = odds.teamA / odds.teamB;
    const eB = odds.teamB / odds.teamA;
    const pA_un = Math.exp(-eA / profile.temperature);
    const pB_un = Math.exp(-eB / profile.temperature);
    baseProbA = pA_un / (pA_un + pB_un);
  }

  // 2. Bias Correction
  if (profile.biasCorrection === 'reverse' && baseProbA > 0.6) baseProbA += 0.05;
  if (profile.biasCorrection === 'standard' && baseProbA > 0.6) baseProbA -= 0.02;
  baseProbA = Math.max(0.01, Math.min(0.99, baseProbA));

  const prior = { teamA: baseProbA, teamB: 1 - baseProbA, draw: 0 };

  // 3. Logistic Action2Score Adjustment
  let totalImpactAdj = 0;
  playerImpacts.forEach(p => {
    const weight = profile.posWeights[p.position || ''] || profile.posWeights[p.role || ''] || 1.0;
    totalImpactAdj += p.impact * weight;
  });
  
  // Scale impact adjustment to a probability shift (-0.2 to 0.2)
  const adjustment = (sigmoid(totalImpactAdj) - 0.5) * 0.4;
  prior.teamA = Math.max(0.01, Math.min(0.99, prior.teamA + adjustment));
  prior.teamB = Math.max(0.01, Math.min(0.99, prior.teamB - adjustment));

  // Re-normalize probabilities after adjustment
  const sumAdj = prior.teamA + prior.teamB + prior.draw;
  prior.teamA /= sumAdj;
  prior.teamB /= sumAdj;
  prior.draw /= sumAdj;

  // 4. Time-Decayed Dirichlet Update
  let teamAWins = 0, teamBWins = 0, draws = 0;
  history.forEach(match => {
    const daysAgo = (Date.now() - new Date(match.date).getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.pow(profile.lambda, Math.max(0, daysAgo));
    
    if (match.winner === 'teamA') teamAWins += weight;
    else if (match.winner === 'teamB') teamBWins += weight;
    else draws += weight;
  });

  const S = Math.round(teamAWins + teamBWins + draws) || 10;
  const alphaA = prior.teamA * S;
  const alphaB = prior.teamB * S;
  const alphaD = prior.draw * S;

  const denominator = S + teamAWins + teamBWins + draws;
  const postA = (teamAWins + alphaA) / (denominator || 1);
  const postB = (teamBWins + alphaB) / (denominator || 1);
  const postD = (draws + alphaD) / (denominator || 1);

  return { teamA: postA, teamB: postB, draw: postD, strength: S, adjustment };
}

export function registerAnalysisTools(server: Server) {
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
              oddsA: { type: "number" },
              oddsB: { type: "number" },
              oddsDraw: { type: "number" }
            },
            required: ["oddsA", "oddsB"]
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
                  teamA: { type: "number" },
                  teamB: { type: "number" },
                  draw: { type: "number" }
                },
                required: ["teamA", "teamB"]
              },
              historicalCounts: {
                type: "object",
                properties: {
                  teamAWins: { type: "number" },
                  teamBWins: { type: "number" },
                  draws: { type: "number" }
                },
                required: ["teamAWins", "teamBWins"]
              }
            },
            required: ["boltzmannProbs", "historicalCounts"]
          }
        },
        {
          name: "analyze_match_bayesian",
          description: "Unified Bayesian analysis tool that automatically detects game context and applies tuned mathematical constants for win probability estimation.",
          inputSchema: {
            type: "object",
            properties: {
              teamA: { type: "string" },
              teamB: { type: "string" },
              odds: {
                type: "object",
                properties: {
                  teamA: { type: "number" },
                  teamB: { type: "number" },
                  draw: { type: "number" }
                },
                required: ["teamA", "teamB"]
              },
              playerImpacts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    player: { type: "string" },
                    impact: { type: "number" },
                    position: { type: "number" },
                    role: { type: "string" }
                  },
                  required: ["impact"]
                }
              },
              historicalResults: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    winner: { type: "string", enum: ["teamA", "teamB", "draw"] },
                    date: { type: "string", description: "ISO date string" },
                    score: { type: "string" }
                  },
                  required: ["winner", "date"]
                }
              },
              context: { type: "string", description: "Optional game/tournament context string" },
              marketData: {
                type: "object",
                properties: {
                  polymarketProb: { type: "number", description: "Polymarket implied probability (0.0 to 1.0)" },
                  exchangeOdds: { type: "number", description: "Exchange decimal odds" }
                }
              },
              bankroll: { type: "number", description: "Total bankroll for Kelly calculation", default: 1000 }
            },
            required: ["teamA", "teamB", "odds", "playerImpacts", "historicalResults"]
          }
        },
        {
          name: "analyze_match",
          description: "Comprehensive end-to-end match analysis. Fetches data, normalizes it, gets market sentiment, and runs the Bayesian math engine to provide a betting recommendation.",
          inputSchema: {
            type: "object",
            properties: {
              matchUrl: { type: "string", description: "URL of the match (e.g. from hawk.live, vlr.gg, or hltv.org)" },
              game: { type: "string", enum: ["dota2", "cs2", "lol", "valo"], description: "The game being played" },
              bankroll: { type: "number", description: "Current bankroll for Kelly calculation", default: 1000 }
            },
            required: ["matchUrl", "game"]
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments || {};
    const name = request.params.name;

    try {
      if (name === "get_fair_odds") {
        const validated = GetFairOddsSchema.parse(args);
        const { teamAElo, teamBElo, teamADraftAdvantage = 0 } = validated;

        // Base Elo Probability
        let probA = 1 / (1 + Math.pow(10, (teamBElo - teamAElo) / 400));

        // Adjust for Draft Advantage (make it the most important factor)
        probA += teamADraftAdvantage * 5.0;

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
            })
          }]
        };
      }

      if (name === "get_edge_analysis") {
        const validated = GetEdgeAnalysisSchema.parse(args);
        const { fairProbability: p, bookmakerDecimalOdds: odds } = validated;
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
            })
          }]
        };
      }

      if (name === "calculate_kelly_wager") {
        const validated = CalculateKellyWagerSchema.parse(args);
        const { winProbability: p, decimalOdds, bankroll, fraction = 0.5 } = validated;

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
              })
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
            })
          }]
        };
      }

      if (name === "get_team_momentum") {
        const validated = GetTeamMomentumSchema.parse(args);
        const { recentWinStreak: streak, recentClutchRounds: clutches, recentThrows: throws } = validated;

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
            })
          }]
        };
      }

      if (name === "get_optimal_bet_strategy") {
        const validated = GetOptimalBetStrategySchema.parse(args);
        const {
          teamAElo: eloA,
          teamBElo: eloB,
          teamAMomentum = 1.0,
          teamBMomentum = 1.0,
          bookmakerOddsTeamA: oddsA,
          bookmakerOddsTeamB: oddsB,
          bankroll,
          playerImpacts,
          teamADraftAdvantage = 0
        } = validated;

        const momA = Math.max(0.1, teamAMomentum);
        const momB = Math.max(0.1, teamBMomentum);

        // 1. Calculate Fair Probability using the new Bayesian engine (symmetric)
        const context = identifyGameContext(playerImpacts || [], "generic");
        const result = calculateMatchProbabilities(
          context,
          { teamA: oddsA, teamB: oddsB },
          playerImpacts || [],
          [],
          { a: eloA, b: eloB }
        );

        let probA = result.teamA;

        // Apply massive Draft Advantage weight
        probA += teamADraftAdvantage * 5.0;

        // 2. Apply Psychological Momentum
        probA = probA * (momA / momB);
        probA = Math.max(0.01, Math.min(0.99, probA));
        const probB = 1 - probA;

        // 3. Compare with Bookmaker
        const impliedProbA = 1 / oddsA;
        const impliedProbB = 1 / oddsB;
        const evA = (probA * oddsA) - 1;
        const evB = (probB * oddsB) - 1;

        // 4. Determine best bet
        let bestTeam = probA >= probB ? "Team A" : "Team B";
        let edge = bestTeam === "Team A" ? probA - impliedProbA : probB - impliedProbB;
        let ev = bestTeam === "Team A" ? evA : evB;
        let odds = bestTeam === "Team A" ? oddsA : oddsB;
        let prob = bestTeam === "Team A" ? probA : probB;

        // 5. Calculate Kelly Wager
        let recommendedWager = 0;
        let recommendation = "No Value Bet - Skip";

        if (ev > 0 && odds > 1.0) {
          const b = odds - 1;
          const q = 1 - prob;
          const kellyPct = (prob * b - q) / b;
          recommendedWager = Math.max(0, bankroll * kellyPct * 0.25);
          recommendation = ev > 0.10 ? "Strong Value Bet" : "Marginal Value Bet";
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              analysis_summary: {
                teamA_true_prob: (probA * 100).toFixed(2) + "%",
                teamB_true_prob: (probB * 100).toFixed(2) + "%",
                teamA_EV: (evA * 100).toFixed(2) + "%",
                teamB_EV: (evB * 100).toFixed(2) + "%"
              },
              optimal_bet: {
                target: bestTeam,
                rationale: recommendation,
                probability_edge: (edge * 100).toFixed(2) + "%",
                expected_value: (ev * 100).toFixed(2) + "%",
                recommended_wager_amount: recommendedWager.toFixed(2)
              }
            })
          }]
        };
      }

      if (name === "calculate_boltzmann_probs") {
        const validated = CalculateBoltzmannProbsSchema.parse(args);
        const { oddsA, oddsB, oddsDraw } = validated;

        const eA = oddsA / oddsB;
        const eB = oddsB / oddsA;
        const eD = oddsDraw;

        const pA_un = Math.exp(-eA);
        const pB_un = Math.exp(-eB);
        const pD_un = eD !== undefined ? Math.exp(-eD) : 0;

        const Z = pA_un + pB_un + pD_un;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              teamA_prob: (pA_un / (Z || 1)).toFixed(4),
              teamB_prob: (pB_un / (Z || 1)).toFixed(4),
              draw_prob: (pD_un / (Z || 1)).toFixed(4)
            })
          }]
        };
      }

      if (name === "calculate_bayesian_dirichlet") {
        const validated = CalculateBayesianDirichletSchema.parse(args);
        const { boltzmannProbs, historicalCounts } = validated;

        const teamAWins = historicalCounts.teamAWins;
        const teamBWins = historicalCounts.teamBWins;
        const draws = historicalCounts.draws || 0;

        const S = Math.round(teamAWins + teamBWins + draws) || 10;
        const alphaA = boltzmannProbs.teamA * S;
        const alphaB = boltzmannProbs.teamB * S;
        const alphaD = (boltzmannProbs.draw || 0) * S;

        const denominator = S + teamAWins + teamBWins + draws;
        const postA = (teamAWins + alphaA) / (denominator || 1);
        const postB = (teamBWins + alphaB) / (denominator || 1);
        const postD = (draws + alphaD) / (denominator || 1);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              posterior_teamA: postA.toFixed(4),
              posterior_teamB: postB.toFixed(4),
              posterior_draw: postD.toFixed(4),
              prior_strength: S
            })
          }]
        };
      }

      if (name === "analyze_match_bayesian") {
        const validated = AnalyzeMatchBayesianSchema.parse(args);
        const { odds, playerImpacts, historicalResults, context: contextStr, marketData, bankroll = 1000 } = validated;

        const context = identifyGameContext(playerImpacts, contextStr);
        const result = calculateMatchProbabilities(context, odds, playerImpacts, historicalResults);

        const evA = (result.teamA * odds.teamA) - 1;
        const evB = (result.teamB * odds.teamB) - 1;
        const evDraw = odds.draw ? (result.draw * odds.draw) - 1 : -1;

        let bestOutcome: 'teamA' | 'teamB' | 'draw' = 'teamA';
        let maxEV = evA;
        if (evB > maxEV) { bestOutcome = 'teamB'; maxEV = evB; }
        if (evDraw > maxEV) { bestOutcome = 'draw'; maxEV = evDraw; }

        let recommendation = "Skip";
        let wager = 0;

        if (maxEV > 0.02) {
          const p = bestOutcome === 'teamA' ? result.teamA : (bestOutcome === 'teamB' ? result.teamB : result.draw);
          const o = bestOutcome === 'teamA' ? odds.teamA : (bestOutcome === 'teamB' ? odds.teamB : odds.draw!);
          const kelly = (p * (o - 1) - (1 - p)) / (o - 1);
          wager = Math.max(0, bankroll * kelly * 0.25);
          recommendation = `Bet on ${bestOutcome} (+EV: ${(maxEV * 100).toFixed(2)}%)`;
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              game_context: context,
              probabilities: {
                teamA: (result.teamA * 100).toFixed(2) + "%",
                teamB: (result.teamB * 100).toFixed(2) + "%",
                draw: (result.draw * 100).toFixed(2) + "%"
              },
              fair_odds: {
                teamA: (1 / result.teamA).toFixed(3),
                teamB: (1 / result.teamB).toFixed(3),
                draw: result.draw > 0 ? (1 / result.draw).toFixed(3) : "N/A"
              },
              ev_analysis: {
                teamA: (evA * 100).toFixed(2) + "%",
                teamB: (evB * 100).toFixed(2) + "%",
                draw: odds.draw ? (evDraw * 100).toFixed(2) + "%" : "N/A"
              },
              betting_strategy: {
                recommendation,
                optimal_wager: wager.toFixed(2),
                kelly_fraction: "0.25 (Quarter-Kelly)"
              },
              market_comparison: marketData ? {
                polymarket_diff: marketData.polymarketProb ? ((result.teamA - marketData.polymarketProb) * 100).toFixed(2) + "%" : "N/A"
              } : "No market data",
              prior_strength: result.strength,
              impact_adjustment: result.adjustment.toFixed(4)
            })
          }]
        };
      }

      if (name === "analyze_match") {
        const validated = AnalyzeMatchSchema.parse(args);
        const { matchUrl, game, bankroll = 1000 } = validated;

        const analysis = await analyzeMatch(matchUrl, game, bankroll);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(analysis)
          }]
        };
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return {
          content: [{
            type: "text",
            text: `Invalid input: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
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
