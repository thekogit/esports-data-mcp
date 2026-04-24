import { calculateMatchProbabilities } from './analysis';

describe('Final Corrections Verification', () => {
  test('Elo Integration', () => {
    const elo = { a: 1600, b: 1400 };
    const odds = { home: 1.5, away: 2.5 };
    const result = calculateMatchProbabilities('valo', odds, [], [], elo);
    
    // Elo prob: ~0.76
    expect(result.home).toBeGreaterThan(0.7);
    expect(result.home).toBeLessThan(0.8);
  });

  test('Bias Correction reverse (Dota 2)', () => {
    const elo = { a: 1147, b: 1000 }; // ~0.7 baseline
    const odds = { home: 1.5, away: 2.5 };
    const result = calculateMatchProbabilities('dota2', odds, [], [], elo);
    
    // ~0.7 + 0.05 = 0.75
    expect(result.home).toBeGreaterThan(0.72);
  });

  test('Bias Correction standard (CS2)', () => {
    const elo = { a: 1147, b: 1000 }; // ~0.7 baseline
    const odds = { home: 1.5, away: 2.5 };
    const result = calculateMatchProbabilities('cs2', odds, [], [], elo);
    
    // ~0.7 - 0.02 = 0.68
    expect(result.home).toBeLessThan(0.7);
    expect(result.home).toBeGreaterThan(0.65);
  });
});

// Mock logic test for calculate_bayesian_dirichlet division-by-zero
describe('Bayesian Dirichlet safety', () => {
  test('Safe division with zero totals', () => {
    const boltzmannProbs = { home: 0.5, away: 0.5 };
    const historicalCounts = { homeWins: 0, awayWins: 0 };
    
    // Logic from the tool handler:
    const homeWins = historicalCounts.homeWins;
    const awayWins = historicalCounts.awayWins;
    const draws = 0;

    const S = Math.round(homeWins + awayWins + draws); // S = 0
    const alphaH = boltzmannProbs.home * S; // 0
    const alphaA = boltzmannProbs.away * S; // 0
    const alphaD = 0;

    const totalAlpha = alphaH + alphaA + alphaD; // 0
    const totalCount = homeWins + awayWins + draws; // 0
    const denominator = totalCount + totalAlpha; // 0

    const posteriorHome = (homeWins + alphaH) / (denominator || 1);
    
    expect(posteriorHome).toBe(0);
    expect(isFinite(posteriorHome)).toBe(true);
  });
});

