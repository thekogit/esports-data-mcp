import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

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
            teamAMomentum: { type: "number", description: "Momentum multiplier for Team A (e.g. 1.05)" },
            teamBMomentum: { type: "number", description: "Momentum multiplier for Team B (e.g. 0.95)" },
            bookmakerOddsTeamA: { type: "number", description: "Decimal odds for Team A" },
            bookmakerOddsTeamB: { type: "number", description: "Decimal odds for Team B" },
            polymarketProbabilityTeamA: { type: "number", description: "Market implied probability from Polymarket (0.0 to 1.0)" },
            bankroll: { type: "number" }
          },
          required: ["teamAElo", "teamBElo", "bookmakerOddsTeamA", "bookmakerOddsTeamB", "bankroll"]
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
    const b = (args.decimalOdds as number) - 1; // b is net odds
    const q = 1 - p;
    const fraction = (args.fraction as number) || 0.5; // Default half-kelly
    const bankroll = args.bankroll as number;
    
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
    const momentumA = Math.max(0.1, (args.teamAMomentum as number) ?? 1.0);
    const momentumB = Math.max(0.1, (args.teamBMomentum as number) ?? 1.0);
    const oddsA = args.bookmakerOddsTeamA as number;
    const oddsB = args.bookmakerOddsTeamB as number;
    const bankroll = args.bankroll as number;
    const polymarketProbA = args.polymarketProbabilityTeamA as number | undefined;

    // 1. Calculate Fair Probability (Elo + Draft + ActionScore)
    // Action2Score adjustment (if B has a high action score, A's win probability goes down slightly)
    let probA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    probA += draftAdv;
    probA -= (actionScoreB * 0.05); // Arbitrary scaling for the impact metric
    
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
      const b = odds - 1;
      const q = 1 - prob;
      kellyPct = (prob * b - q) / b;
      
      // Use Fractional Kelly (1/4 Kelly) to adjust for Overinference/Underinference risks noted in literature
      const fractionalKelly = kellyPct * 0.25; 
      recommendedWager = Math.max(0, bankroll * fractionalKelly);
      
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

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Probability Analysis MCP Server running");
}

main().catch(console.error);
