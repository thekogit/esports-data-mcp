import { getPolymarketProbability } from './polymarket';
import { fetchJson } from './fetcher';

jest.mock('./fetcher');

describe('getPolymarketProbability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns probability for Team A when it is the subject of the question', async () => {
    (fetchJson as jest.Mock).mockResolvedValue([
      {
        question: 'Will G2 Esports beat Natus Vincere?',
        description: 'G2 vs Navi match',
        outcomePrices: '["0.65", "0.35"]',
        volume: 1000,
        active: true,
        closed: false
      }
    ]);

    const prob = await getPolymarketProbability('G2 Esports', 'Natus Vincere');
    expect(prob).toBe(0.65);
  });

  it('returns probability for Team A when it is the object of the question', async () => {
    (fetchJson as jest.Mock).mockResolvedValue([
      {
        question: 'Will G2 Esports beat Natus Vincere?',
        description: 'G2 vs Navi match',
        outcomePrices: '["0.65", "0.35"]',
        volume: 1000,
        active: true,
        closed: false
      }
    ]);

    const prob = await getPolymarketProbability('Natus Vincere', 'G2 Esports');
    expect(prob).toBe(0.35);
  });

  it('picks the market with the highest volume', async () => {
    (fetchJson as jest.Mock).mockResolvedValue([
      {
        question: 'Will G2 beat Navi?',
        outcomePrices: '["0.50", "0.50"]',
        volume: 10,
        active: true,
        closed: false
      },
      {
        question: 'Will G2 beat Navi?',
        outcomePrices: '["0.65", "0.35"]',
        volume: 10000,
        active: true,
        closed: false
      }
    ]);

    const prob = await getPolymarketProbability('G2', 'Navi');
    expect(prob).toBe(0.65);
  });

  it('returns null when no relevant market is found', async () => {
    (fetchJson as jest.Mock).mockResolvedValue([]);
    const prob = await getPolymarketProbability('T1', 'GenG');
    expect(prob).toBeNull();
  });

  it('handles invalid outcomePrices JSON', async () => {
    (fetchJson as jest.Mock).mockResolvedValue([
      {
        question: 'Will G2 beat Navi?',
        outcomePrices: 'invalid-json',
        volume: 100,
        active: true,
        closed: false
      }
    ]);
    const prob = await getPolymarketProbability('G2', 'Navi');
    expect(prob).toBeNull();
  });
});
