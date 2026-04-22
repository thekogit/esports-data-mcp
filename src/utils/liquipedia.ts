import { fetchHtml } from './fetcher';
import * as cheerio from 'cheerio';

export async function getLiquipediaTournaments(game: string) {
  const url = `https://liquipedia.net/${game}/Portal:Tournaments`;
  const html = await fetchHtml(url).catch(() => null);
  if (!html) return [];
  const $ = cheerio.load(html);
  const tournaments: any[] = [];
  
  // Liquipedia ongoing tournaments are usually in a table after the "Ongoing" heading
  // Common selector for these tables
  $('.tournament-list, .wikitable').each((i, table) => {
    // Check if this table is under an "Ongoing" or "Current" section
    const prevHeader = $(table).prevAll('h2, h3').first().text().toLowerCase();
    if (prevHeader.includes('ongoing') || prevHeader.includes('current')) {
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          tournaments.push({
            tier: $(cells[0]).text().trim(),
            name: $(cells[1]).text().trim(),
            dates: $(cells[2]).text().trim(),
          });
        }
      });
    }
  });

  // Fallback to divTable selector if still empty
  if (tournaments.length === 0) {
    $('.divTable .divRow').each((i, el) => {
      tournaments.push({
        name: $(el).find('.Tournament, .divCell:nth-child(2)').text().trim(),
        dates: $(el).find('.Date, .divCell:nth-child(3)').text().trim(),
        tier: $(el).find('.Tier, .divCell:nth-child(1)').text().trim(),
      });
    }
    );
  }

  return tournaments.filter(t => t.name);
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
