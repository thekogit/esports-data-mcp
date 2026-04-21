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

    // 2. Map "Yes" to the correct team
    // "Will {Team X} beat {Team Y}?" -> Yes (index 0) is Team X
    const question = market.question.toLowerCase();
    const teamALower = teamA.toLowerCase();
    
    // Check if Team A is the subject of the "Will X beat Y" question
    // This is a heuristic: if Team A appears before "beat" or at the start of the question
    const beatIndex = question.indexOf("beat");
    const teamAIndex = question.indexOf(teamALower);
    
    if (beatIndex !== -1 && teamAIndex !== -1 && teamAIndex < beatIndex) {
      // Team A is X in "Will X beat Y?" -> Index 0 (Yes) is Team A
      return parseFloat(prices[0]) || null;
    } else if (beatIndex !== -1 && teamAIndex !== -1 && teamAIndex > beatIndex) {
      // Team A is Y in "Will X beat Y?" -> Index 1 (No) is Team A
      return parseFloat(prices[1]) || null;
    }
    
    // Fallback: if we can't determine from "beat", check if it starts with Team A
    if (question.startsWith(`will ${teamALower}`)) {
      return parseFloat(prices[0]) || null;
    }

    // If we still can't be sure, return null to be safe rather than returning wrong probability
    return null;
  } catch (error) {
    console.error('Error fetching Polymarket probability:', error);
    return null;
  }
}
