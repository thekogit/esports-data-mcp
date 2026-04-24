
import { calculateMatchProbabilities, identifyGameContext } from '../src/analysis.js';

const playerImpacts = [
  { impact: 2.5, position: 1 },
  { impact: 1.8, position: 2 },
  { impact: 1.2, position: 3 },
  { impact: 0.5, position: 4 },
  { impact: 0.4, position: 5 }
];

const odds = { home: 1.8, away: 2.1 };
const history = [
  { winner: 'home', date: new Date().toISOString() },
  { winner: 'home', date: new Date().toISOString() }
];

const context = identifyGameContext(playerImpacts, 'Dota 2 match');
console.log('Detected Context:', context);

const result = calculateMatchProbabilities(context, odds, playerImpacts, history);
console.log('Result:', JSON.stringify(result, null, 2));

const sum = result.home + result.away + result.draw;
console.log('Sum of Probabilities:', sum);

if (Math.abs(sum - 1.0) < 0.0001) {
  console.log('RE-NORMALIZATION VERIFIED: Sum is 1.0');
} else {
  console.error('RE-NORMALIZATION FAILED: Sum is', sum);
  process.exit(1);
}

// Verify EV and Strategy logic (manual check)
const evHome = (result.home * odds.home) - 1;
console.log('EV Home:', evHome.toFixed(4));
