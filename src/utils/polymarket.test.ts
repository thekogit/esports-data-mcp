import { getPolymarketProbability } from './polymarket';
import { fetchJson } from './fetcher';

jest.mock('./fetcher');

describe('getPolymarketProbability', () => {
  it('returns probability when a relevant market is found', async () => {
    (fetchJson as jest.Mock).mockResolvedValue([
      {
        question: 'Will G2 Esports beat Natus Vincere?',
        description: 'G2 vs Navi match',
        outcomePrices: '["0.65", "0.35"]'
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
});
