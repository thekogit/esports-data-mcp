import { getLiquipediaRoster } from './liquipedia';

describe('getLiquipediaRoster', () => {
  it('should fetch both players and coach from a team page', async () => {
    // This will initially fail or return only players without the new structure
    const roster = await getLiquipediaRoster('dota2', 'Team_Spirit');
    expect(roster).toHaveProperty('players');
    expect(roster).toHaveProperty('coach');
    expect(Array.isArray(roster.players)).toBe(true);
  });
});
