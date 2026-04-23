const { spawn } = require('child_process');

async function testServer(serverScript, toolName, args = {}) {
  return new Promise((resolve, reject) => {
    const cp = spawn('node', [serverScript]);
    
    let output = '';
    cp.stdout.on('data', (data) => {
      const msgs = data.toString().split('\n').filter(Boolean);
      for (const msg of msgs) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed.id === 1) { // init response
            cp.stdin.write(JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: { name: toolName, arguments: args }
            }) + '\n');
          } else if (parsed.id === 2) { // tool response
            cp.kill();
            resolve(parsed.result || parsed.error);
          }
        } catch (e) {}
      }
    });

    cp.stderr.on('data', (data) => {
      // console.error(`[${serverScript}]`, data.toString());
    });

    // Send init
    cp.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } }
    }) + '\n');

    setTimeout(() => {
      cp.kill();
      reject(new Error("Timeout"));
    }, 5000);
  });
}

async function runTests() {
  console.log("Testing Analysis Server - get_optimal_bet_strategy...");
  
  const baseArgs = {
    teamAElo: 1500,
    teamBElo: 1400,
    teamADraftAdvantage: 0.05,
    teamBActionScore: 0.1,
    teamAMomentum: 1.1,
    teamBMomentum: 1.0,
    bookmakerOddsTeamA: 2.0,
    bookmakerOddsTeamB: 1.8,
    bankroll: 1000
  };

  console.log("\nScenario 1: No Polymarket Data");
  try {
    const result = await testServer('dist/analysis.js', 'get_optimal_bet_strategy', baseArgs);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.log("Error:", e.message); }

  console.log("\nScenario 2: Polymarket Confirmed");
  try {
    const result = await testServer('dist/analysis.js', 'get_optimal_bet_strategy', {
      ...baseArgs,
      polymarketProbabilityTeamA: 0.6 // Model will likely favor A
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.log("Error:", e.message); }

  console.log("\nScenario 3: Polymarket Confirmed (Both model and market see value vs bookie)");
  try {
    const result = await testServer('dist/analysis.js', 'get_optimal_bet_strategy', {
      ...baseArgs,
      polymarketProbabilityTeamA: 0.8 // Model 75%, Market 80%, Bookie 50% -> Both > 50% = Confirmed
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.log("Error:", e.message); }

  console.log("\nScenario 4: High Divergence (>20% difference)");
  try {
    const result = await testServer('dist/analysis.js', 'get_optimal_bet_strategy', {
      ...baseArgs,
      polymarketProbabilityTeamA: 0.96 // Model 75.36%, Market 96% -> |75.36 - 96| > 20%
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.log("Error:", e.message); }

  console.log("\nScenario 5: Player Impacts (Accurate Roles)");
  try {
    const result = await testServer('dist/analysis.js', 'get_optimal_bet_strategy', {
      ...baseArgs,
      playerImpacts: [
        { impact: 0.2, position: 1 }, // Carry with high impact
        { impact: 0.1, position: 2 }, // Mid with some impact
        { impact: -0.1, position: 5 } // Support with negative impact
      ]
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.log("Error:", e.message); }

  console.log("\nTesting Boltzmann Probabilities...");
  try {
    const result = await testServer('dist/analysis.js', 'calculate_boltzmann_probs', {
      oddsHome: 2.0,
      oddsAway: 2.0
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.log("Error:", e.message); }

  console.log("\nTesting Bayesian Dirichlet...");
  try {
    // Example: Boltzmann gives 50/50, but history shows 10/10 wins.
    // Posterior should stay 50/50.
    const result = await testServer('dist/analysis.js', 'calculate_bayesian_dirichlet', {
      boltzmannProbs: { home: 0.5, away: 0.5, draw: 0 },
      historicalCounts: { homeWins: 10, awayWins: 10, draws: 0 }
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.log("Error:", e.message); }
}

runTests();
