import { fetchJson } from './fetcher';

export interface PolymarketMarket {
  question: string;
  description: string;
  outcomePrices: string;
  outcomes?: string;
  volume: string | number;
  active: boolean;
  closed: boolean;
}

export async function getPolymarketProbability(teamA: string, teamB: string): Promise<number | null> {
  try {
    const query = encodeURIComponent(`${teamA} ${teamB}`);
    const url = `https://gamma-api.polymarket.com/markets?active=true&query=${query}&limit=20`;
    const markets = await fetchJson(url) as PolymarketMarket[];

    if (!Array.isArray(markets) || markets.length === 0) {
      return null;
    }

    // 1. Filter relevant markets and sort by volume (highest first)
    const relevantMarkets = markets
      .filter(m => {
        const text = (m.question + " " + (m.description || "")).toLowerCase();
        return text.includes(teamA.toLowerCase()) && text.includes(teamB.toLowerCase());
      })
      .sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0));

    if (relevantMarkets.length === 0) {
      return null;
    }

    const market = relevantMarkets[0];
    if (!market.outcomePrices) {
      return null;
    }

    let prices: string[];
    try {
      prices = JSON.parse(market.outcomePrices);
      if (!Array.isArray(prices) || prices.length < 2) {
        return null;
      }
    } catch {
      return null;
    }

    const parseProb = (val: string): number | null => {
      const p = parseFloat(val);
      return isNaN(p) ? null : p;
    };

    // 2. Map "Yes" to the correct team
    // "Will {Team X} beat {Team Y}?" -> Yes (index 0) is Team X
    const question = market.question.toLowerCase();
    const teamALower = teamA.toLowerCase();
    
    // Check if Team A is the subject or object of the "beat" question
    if (question.includes(`will ${teamALower} beat`)) {
      // "Will Team A beat Team B?" -> Yes (index 0) is Team A winning
      return parseProb(prices[0]);
    }
    
    if (question.includes(`beat ${teamALower}`)) {
      // "Will Team B beat Team A?" -> No (index 1) is Team A winning
      return parseProb(prices[1]);
    }
    
    // Fallback: if we can't determine from "beat", check if it starts with Team A winning
    if (question.startsWith(`will ${teamALower} win`) || question.startsWith(`will ${teamALower} be the winner`)) {
      return parseProb(prices[0]);
    }

    // Try a more loose check as a last resort
    if (question.startsWith(`will ${teamALower}`)) {
      return parseProb(prices[0]);
    }

    // If we still can't be sure, return null to be safe rather than returning wrong probability
    return null;
  } catch (error) {
    console.error('Error fetching Polymarket probability:', error);
    return null;
  }
}
