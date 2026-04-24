
import { calculateMatchProbabilities } from './analysis';

describe('calculateMatchProbabilities', () => {
  const mockOdds = { home: 1.8, away: 2.1 };
  const mockImpacts = [
    { impact: 0.5, position: 1 },
    { impact: 0.2, position: 2 }
  ];
  const mockHistory = [
    { winner: 'home', date: new Date().toISOString() },
    { winner: 'away', date: new Date(Date.now() - 86400000 * 2).toISOString() }
  ];

  test('calculates probabilities with impact adjustment', () => {
    const result = calculateMatchProbabilities('dota2', mockOdds, mockImpacts, mockHistory);
    
    expect(result).toHaveProperty('home');
    expect(result).toHaveProperty('away');
    expect(result).toHaveProperty('draw');
    expect(result).toHaveProperty('strength');
    expect(result).toHaveProperty('adjustment');
    
    expect(result.home).toBeGreaterThan(0);
    expect(result.home).toBeLessThan(1);
    expect(result.adjustment).not.toBe(0);
  });

  test('handles zero division with empty history', () => {
    const result = calculateMatchProbabilities('generic', mockOdds, [], []);
    expect(result.strength).toBe(10); // Default S
    expect(result.home + result.away + result.draw).toBeCloseTo(1, 5);
  });

  test('impact adjustment shifts probabilities correctly', () => {
    const positiveImpact = [{ impact: 2.0, position: 1 }];
    const negativeImpact = [{ impact: -2.0, position: 1 }];
    
    const resPos = calculateMatchProbabilities('dota2', mockOdds, positiveImpact, []);
    const resNeg = calculateMatchProbabilities('dota2', mockOdds, negativeImpact, []);
    
    expect(resPos.adjustment).toBeGreaterThan(0);
    expect(resNeg.adjustment).toBeLessThan(0);
    expect(resPos.home).toBeGreaterThan(resNeg.home);
  });

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

