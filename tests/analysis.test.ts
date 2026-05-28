import { identifyGameContext, calculateMatchProbabilities, PlayerImpact } from '../src/analysis';

describe('Analysis Module', () => {
  describe('identifyGameContext', () => {
    it('should identify dota2 from context keywords', () => {
      expect(identifyGameContext([], 'The International Dota 2')).toBe('dota2');
      expect(identifyGameContext([], 'Roshan is dead')).toBe('dota2');
    });

    it('should identify valo from context keywords', () => {
      expect(identifyGameContext([], 'Valorant Champions')).toBe('valo');
      expect(identifyGameContext([], 'Spike planted')).toBe('valo');
    });

    it('should identify cs2 from context keywords', () => {
      expect(identifyGameContext([], 'CS2 Major')).toBe('cs2');
      expect(identifyGameContext([], 'HLTV stats')).toBe('cs2');
    });

    it('should identify dota2 from player positions', () => {
      const impacts: PlayerImpact[] = [{ impact: 1.0, position: 1 }];
      expect(identifyGameContext(impacts)).toBe('dota2');
    });

    it('should identify valo from player roles', () => {
      const impacts: PlayerImpact[] = [{ impact: 1.0, role: 'Duelist' }];
      expect(identifyGameContext(impacts)).toBe('valo');
    });

    it('should identify cs2 from player roles', () => {
      const impacts: PlayerImpact[] = [{ impact: 1.0, role: 'AWPer' }];
      expect(identifyGameContext(impacts)).toBe('cs2');
    });

    it('should return generic for unknown context and roles', () => {
      expect(identifyGameContext([], 'Unknown tournament')).toBe('generic');
      expect(identifyGameContext([])).toBe('generic');
    });
  });

  describe('calculateMatchProbabilities', () => {
    const odds = { teamA: 1.9, teamB: 1.9 };
    const history: any[] = [];
    const playerImpacts: PlayerImpact[] = [];

    it('should return valid probabilities that sum to 1', () => {
      const result = calculateMatchProbabilities('generic', odds, playerImpacts, history);
      expect(result.teamA + result.teamB + result.draw).toBeCloseTo(1.0);
      expect(result.teamA).toBeGreaterThan(0);
      expect(result.teamB).toBeGreaterThan(0);
    });

    it('should apply adjustments based on player impacts', () => {
      const positiveImpacts: PlayerImpact[] = [{ impact: 2.0 }];
      const negativeImpacts: PlayerImpact[] = [{ impact: -2.0 }];

      const resultPos = calculateMatchProbabilities('generic', odds, positiveImpacts, history);
      const resultNeg = calculateMatchProbabilities('generic', odds, negativeImpacts, history);

      expect(resultPos.teamA).toBeGreaterThan(resultNeg.teamA);
      expect(resultPos.adjustment).toBeGreaterThan(0);
      expect(resultNeg.adjustment).toBeLessThan(0);
    });

    it('should handle different game contexts with biased probabilities', () => {
      // Dota 2 has reverse bias correction
      const dotaResult = calculateMatchProbabilities('dota2', { teamA: 1.5, teamB: 2.5 }, [], []);
      // CS2 has standard bias correction
      const cs2Result = calculateMatchProbabilities('cs2', { teamA: 1.5, teamB: 2.5 }, [], []);

      expect(dotaResult.teamA).not.toBe(cs2Result.teamA);
    });

    it('should update probabilities based on match history (Dirichlet)', () => {
      const matchHistory = [
        { winner: 'teamA', date: new Date().toISOString() },
        { winner: 'teamA', date: new Date().toISOString() }
      ];
      const resultWithHistory = calculateMatchProbabilities('generic', odds, [], matchHistory);
      const resultNoHistory = calculateMatchProbabilities('generic', odds, [], []);

      expect(resultWithHistory.teamA).toBeGreaterThan(resultNoHistory.teamA);
    });
  });
});
