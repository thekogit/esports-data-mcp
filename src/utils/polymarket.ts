import { fetchJson } from './fetcher';

export async function getPolymarketProbability(teamA: string, teamB: string): Promise<number | null> {
  try {
    const query = encodeURIComponent(`${teamA} ${teamB}`);
    const url = `https://gamma-api.polymarket.com/markets?active=true&query=${query}&limit=10`;
    const markets = await fetchJson(url);

    if (!Array.isArray(markets) || markets.length === 0) {
      return null;
    }

    const relevantMarket = markets.find(m => {
      const text = (m.question + " " + m.description).toLowerCase();
      return text.includes(teamA.toLowerCase()) && text.includes(teamB.toLowerCase());
    });

    if (!relevantMarket || !relevantMarket.outcomePrices) {
      return null;
    }

    const prices = JSON.parse(relevantMarket.outcomePrices);
    return parseFloat(prices[0]);
  } catch (error) {
    console.error('Error fetching Polymarket probability:', error);
    return null;
  }
}
