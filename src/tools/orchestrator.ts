import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { 
  NormalizedMatch, 
  EsportsGame, 
  NormalizedTeam, 
  EsportsRole,
  normalizeRole
} from '../utils/normalizer';
import { getLiquipediaRoster, getLiquipediaMatchHistory } from '../utils/liquipedia';
import { getPolymarketProbability } from '../utils/polymarket';
import { parseHawkLiveMatch } from '../utils/hawk_live';

export interface AnalysisResult {
  match: NormalizedMatch;
  marketProbability: number | null;
  modelProbability: number;
  confidenceInterval: [number, number];
  recommendation: string;
  wager: number;
}

export async function analyzeMatch(
  matchUrl: string, 
  game: string, 
  bankroll: number = 1000
): Promise<AnalysisResult> {
  const esportsGame = game.toUpperCase() as EsportsGame;
  const gameLower = game.toLowerCase();
  
  // 1. Scrape Data
  let rawData: any = null;
  let teamAName = 'Team A';
  let teamBName = 'Team B';

  if (esportsGame === EsportsGame.DOTA2 && matchUrl.includes('hawk.live')) {
    rawData = await parseHawkLiveMatch(matchUrl);
    teamAName = rawData?.teamA || teamAName;
    teamBName = rawData?.teamB || teamBName;
  } else {
    // Attempt to extract team names from URL if possible
    // e.g., liquipedia.net/dota2/Team_A_vs_Team_B
    const urlParts = matchUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart.includes('_vs_')) {
      [teamAName, teamBName] = lastPart.split('_vs_').map(s => s.replace(/_/g, ' '));
    } else if (lastPart.includes('-vs-')) {
      [teamAName, teamBName] = lastPart.split('-vs-').map(s => s.replace(/-/g, ' '));
    }
  }
  
  // 2. Normalize Data
  const normalizedMatch: NormalizedMatch = {
    game: esportsGame,
    teamA: { name: teamAName, players: [] },
    teamB: { name: teamBName, players: [] }
  };

  if (rawData?.draft) {
    normalizedMatch.teamA.players = rawData.draft.radiant.map((p: any) => ({
      name: p.player || p.hero,
      role: normalizeRole(p.role || '', esportsGame),
      hero: p.hero
    }));
    normalizedMatch.teamB.players = rawData.draft.dire.map((p: any) => ({
      name: p.player || p.hero,
      role: normalizeRole(p.role || '', esportsGame),
      hero: p.hero
    }));
  }

  // If we don't have roster from live draft, try Liquipedia (fallback for all games)
  const liquipediaGameMap: Record<string, string> = {
    'dota2': 'dota2',
    'cs2': 'counterstrike',
    'lol': 'leagueoflegends',
    'valo': 'valorant'
  };
  const lpGame = liquipediaGameMap[gameLower] || gameLower;

  if (normalizedMatch.teamA.players.length === 0) {
    try {
      const rosterA = await getLiquipediaRoster(lpGame, normalizedMatch.teamA.name.replace(/ /g, '_'));
      normalizedMatch.teamA.players = rosterA.players.map(p => ({
        name: p.id,
        role: EsportsRole.UNKNOWN
      }));
    } catch (e) {
      console.warn(`Failed to fetch Liquipedia roster for ${normalizedMatch.teamA.name}`);
    }
  }
  if (normalizedMatch.teamB.players.length === 0) {
    try {
      const rosterB = await getLiquipediaRoster(lpGame, normalizedMatch.teamB.name.replace(/ /g, '_'));
      normalizedMatch.teamB.players = rosterB.players.map(p => ({
        name: p.id,
        role: EsportsRole.UNKNOWN
      }));
    } catch (e) {
      console.warn(`Failed to fetch Liquipedia roster for ${normalizedMatch.teamB.name}`);
    }
  }

  // 3. Fetch Market Data
  const marketProb = await getPolymarketProbability(normalizedMatch.teamA.name, normalizedMatch.teamB.name);

  // 4. Run Python Predictor
  const predictorInput = {
    ...normalizedMatch,
    market_prob: marketProb,
    // Add some dummy hero winrates for the placeholder predictor
    hero_winrates: normalizedMatch.teamA.players.reduce((acc, p) => {
      if (p.hero) acc[p.hero] = 0.55; // Placeholder
      return acc;
    }, {} as Record<string, number>)
  };

  const predictorResult = await runPythonPredictor(predictorInput);

  // 5. Calculate Betting Recommendation (Simplified Kelly)
  const p = predictorResult.probability;
  // If we don't have odds, we can't calculate Kelly correctly. 
  // For now, let's assume we are comparing against 2.0 (even money) if no market data.
  const decimalOdds = marketProb ? 1 / marketProb : 2.0;
  const b = decimalOdds - 1;
  const q = 1 - p;
  const kelly = (p * b - q) / b;
  const wager = Math.max(0, bankroll * kelly * 0.25); // Quarter Kelly

  return {
    match: normalizedMatch,
    marketProbability: marketProb,
    modelProbability: p,
    confidenceInterval: predictorResult.confidence_interval,
    recommendation: p > (marketProb || 0.5) ? `Value found on ${normalizedMatch.teamA.name}` : `No strong value detected`,
    wager: Number(wager.toFixed(2))
  };
}

async function runPythonPredictor(input: any): Promise<{ probability: number, confidence_interval: [number, number] }> {
  return new Promise((resolve, reject) => {
    const pythonPath = 'python'; // or 'python3' depending on environment
    const scriptPath = path.resolve(__dirname, '../../src/math_engine/predictor.py');
    
    const pyProcess = spawn(pythonPath, [scriptPath]);

    let output = '';
    let errorOutput = '';

    pyProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
        return;
      }
      try {
        resolve(JSON.parse(output));
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${output}`));
      }
    });

    pyProcess.stdin.write(JSON.stringify(input));
    pyProcess.stdin.end();
  });
}
