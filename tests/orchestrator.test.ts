import { analyzeMatch } from '../src/tools/orchestrator';
import * as liquipedia from '../src/utils/liquipedia';
import * as polymarket from '../src/utils/polymarket';
import * as hawkLive from '../src/utils/hawk_live';
import * as crossGameParsers from '../src/utils/cross_game_parsers';
import { spawn } from 'child_process';

jest.mock('../src/utils/liquipedia');
jest.mock('../src/utils/polymarket');
jest.mock('../src/utils/hawk_live');
jest.mock('../src/utils/cross_game_parsers');
jest.mock('child_process');

describe('Orchestrator Module', () => {
  const mockMatchUrl = 'https://hawk.live/matches/123';
  const mockGame = 'dota2';
  const mockBankroll = 1000;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should analyze a match and return a recommendation', async () => {
    // Mock HawkLive parser
    (hawkLive.parseHawkLiveMatch as jest.Mock).mockResolvedValue({
      teamA: 'Team Secret',
      teamB: 'OG',
      draft: {
        radiant: [{ player: 'Puppey', role: 'Support', hero: 'Chen' }],
        dire: [{ player: 'Ceb', role: 'Offlane', hero: 'Axe' }]
      }
    });

    // Mock Polymarket
    (polymarket.getPolymarketProbability as jest.Mock).mockResolvedValue(0.5);

    // Mock Python Predictor via spawn
    const mockProcess: any = {
      stdout: {
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            cb(Buffer.from(JSON.stringify({ probability: 0.6, confidence_interval: [0.55, 0.65] })));
          }
        }),
      },
      stderr: {
        on: jest.fn(),
      },
      on: jest.fn((event, cb) => {
        if (event === 'close') {
          cb(0);
        }
      }),
      stdin: {
        write: jest.fn(),
        end: jest.fn(),
      },
    };
    (spawn as jest.Mock).mockReturnValue(mockProcess);

    const result = await analyzeMatch(mockMatchUrl, mockGame, mockBankroll);

    expect(result).toBeDefined();
    expect(result.match.teamA.name).toBe('Team Secret');
    expect(result.match.teamB.name).toBe('OG');
    expect(result.modelProbability).toBe(0.6);
    expect(result.marketProbability).toBe(0.5);
    expect(result.recommendation).toContain('Value found');
    expect(result.wager).toBeGreaterThan(0);
  });

  it('should fallback to Liquipedia if draft data is missing', async () => {
    // Mock VLR parser with no draft
    (crossGameParsers.parseVlrMatch as jest.Mock).mockResolvedValue({
      teamA: 'Sentinels',
      teamB: 'Fnatic'
    });

    // Mock Liquipedia roster
    (liquipedia.getLiquipediaRoster as jest.Mock).mockResolvedValue({
      players: [{ id: 'TenZ' }, { id: 'zekken' }]
    });

    (polymarket.getPolymarketProbability as jest.Mock).mockResolvedValue(0.5);

    // Mock Python Predictor
    const mockProcess: any = {
      stdout: {
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            cb(Buffer.from(JSON.stringify({ probability: 0.4, confidence_interval: [0.35, 0.45] })));
          }
        }),
      },
      stderr: {
        on: jest.fn(),
      },
      on: jest.fn((event, cb) => {
        if (event === 'close') {
          cb(0);
        }
      }),
      stdin: {
        write: jest.fn(),
        end: jest.fn(),
      },
    };
    (spawn as jest.Mock).mockReturnValue(mockProcess);

    const result = await analyzeMatch('https://www.vlr.gg/123', 'valo', mockBankroll);

    expect(result.match.teamA.players.length).toBeGreaterThan(0);
    expect(liquipedia.getLiquipediaRoster).toHaveBeenCalled();
    expect(result.recommendation).toContain('No strong value');
  });
});
