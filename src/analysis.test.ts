
import { identifyGameContext } from './analysis';

describe('identifyGameContext', () => {
  test('detects dota2 from context keywords', () => {
    expect(identifyGameContext([], 'Dota 2 match')).toBe('dota2');
    expect(identifyGameContext([], 'Something with Roshan')).toBe('dota2');
  });

  test('detects valo from context keywords', () => {
    expect(identifyGameContext([], 'Valorant Champions')).toBe('valo');
    expect(identifyGameContext([], 'Spike plant')).toBe('valo');
  });

  test('detects cs2 from context keywords', () => {
    expect(identifyGameContext([], 'CS2 Major')).toBe('cs2');
    expect(identifyGameContext([], 'HLTV ranking')).toBe('cs2');
  });

  test('detects league as dota2 profile', () => {
    expect(identifyGameContext([], 'League of Legends')).toBe('dota2');
    expect(identifyGameContext([], 'Nexus destroyed')).toBe('dota2');
  });

  test('detects dota2 from positions using .some()', () => {
    expect(identifyGameContext([{ impact: 1, position: 3 }], '')).toBe('dota2');
    expect(identifyGameContext([{ impact: 1, role: 'something' }, { impact: 1, position: 5 }], '')).toBe('dota2');
  });

  test('detects games from roles', () => {
    expect(identifyGameContext([{ impact: 1, role: 'Duelist' }], '')).toBe('valo');
    expect(identifyGameContext([{ impact: 1, role: 'AWPer' }], '')).toBe('cs2');
    expect(identifyGameContext([{ impact: 1, role: 'Jungler' }], '')).toBe('dota2');
  });

  test('returns generic for unknown context and roles', () => {
    expect(identifyGameContext([], 'random')).toBe('generic');
    expect(identifyGameContext([{ impact: 1, role: 'unknown' }], '')).toBe('generic');
  });
});
