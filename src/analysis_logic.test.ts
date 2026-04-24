
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
});
