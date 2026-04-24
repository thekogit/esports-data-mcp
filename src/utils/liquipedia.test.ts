import { getLiquipediaRoster } from './liquipedia';
import { fetchHtml } from './fetcher';

jest.mock('./fetcher');

const mockedFetchHtml = fetchHtml as jest.MockedFunction<typeof fetchHtml>;

describe('getLiquipediaRoster', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse players and coach from team card layout', async () => {
    const html = `
      <div class="teamcard-inner">
        <div class="player">Yatoro</div>
        <div class="player">Larl</div>
        <div class="player">Collapse</div>
        <div class="player">Mira</div>
        <div class="player">Miposhka</div>
      </div>
      <div class="infobox-cell-2">Head Coach</div>
      <div class="infobox-cell-2">Silent</div>
    `;
    mockedFetchHtml.mockResolvedValue(html);

    const roster = await getLiquipediaRoster('dota2', 'Team_Spirit');
    
    expect(roster.players).toHaveLength(5);
    expect(roster.players[0].id).toBe('Yatoro');
    expect(roster.coach).toBe('Silent');
  });

  it('should parse real names from roster table layout', async () => {
    const html = `
      <table class="wikitable roster-table">
        <tr><th>ID</th><th>Name</th><th>Role</th></tr>
        <tr>
          <td><span class="player"><a href="/dota2/Yatoro">Yatoro</a></span></td>
          <td>Illya Mulyarchuk</td>
          <td>Carry</td>
        </tr>
        <tr>
          <td><span class="player"><a href="/dota2/Larl">Larl</a></span></td>
          <td>Denis Sigitov</td>
          <td>Mid</td>
        </tr>
      </table>
    `;
    mockedFetchHtml.mockResolvedValue(html);

    const roster = await getLiquipediaRoster('dota2', 'Team_Spirit');
    
    expect(roster.players).toHaveLength(2);
    expect(roster.players[0].id).toBe('Yatoro');
    expect(roster.players[0].name).toBe('Illya Mulyarchuk');
    expect(roster.players[1].id).toBe('Larl');
    expect(roster.players[1].name).toBe('Denis Sigitov');
  });

  it('should not include table headers as players', async () => {
    const html = `
      <table class="wikitable roster-table">
        <tr><th>ID</th><th>Name</th><th>Role</th></tr>
        <tr>
          <td><span class="player">Yatoro</span></td>
          <td>Illya Mulyarchuk</td>
          <td>Carry</td>
        </tr>
      </table>
    `;
    mockedFetchHtml.mockResolvedValue(html);

    const roster = await getLiquipediaRoster('dota2', 'Team_Spirit');
    
    const ids = roster.players.map(p => p.id);
    expect(ids).not.toContain('ID');
    expect(ids).not.toContain('Name');
    expect(ids).toContain('Yatoro');
  });

  it('should parse coach from staff table', async () => {
    const html = `
      <table class="wikitable staff-table">
        <tr><th>Position</th><th>Name</th></tr>
        <tr>
          <td>Coach</td>
          <td>Silent</td>
        </tr>
      </table>
    `;
    mockedFetchHtml.mockResolvedValue(html);

    const roster = await getLiquipediaRoster('dota2', 'Team_Spirit');
    expect(roster.coach).toBe('Silent');
  });
});
