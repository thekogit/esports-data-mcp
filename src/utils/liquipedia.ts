import { fetchHtml } from './fetcher';
import * as cheerio from 'cheerio';

export async function getLiquipediaTournaments(game: string) {
  const url = `https://liquipedia.net/${game}/Portal:Tournaments`;
  const html = await fetchHtml(url).catch(() => null);
  if (!html) return [];
  const $ = cheerio.load(html);
  const tournaments: any[] = [];
  $('.divTable .divRow').each((i, el) => {
    tournaments.push({
      name: $(el).find('.Tournament').text().trim(),
      dates: $(el).find('.Date').text().trim(),
      tier: $(el).find('.Tier').text().trim(),
    });
  });
  return tournaments;
}

export async function getLiquipediaRoster(game: string, teamName: string) {
  const url = `https://liquipedia.net/${game}/${teamName}`;
  const html = await fetchHtml(url).catch(() => null);
  if (!html) return [];
  const $ = cheerio.load(html);
  const players: string[] = [];
  $('.teamcard-inner .player').each((i, el) => {
    players.push($(el).text().trim());
  });
  return players;
}
