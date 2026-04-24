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
  if (!html) return { players: [], coach: null, lastUpdated: new Date().toISOString() };
  const $ = cheerio.load(html);
  
  const players: any[] = [];
  let coach: string | null = null;

  // 1. Parse Active Roster Table
  $('.teamcard-inner .player, .roster-card .player, .wikitable.roster-table tr').each((i, el) => {
    const name = $(el).text().trim();
    if (name && !players.some(p => p.id === name)) {
      players.push({ id: name });
    }
  });

  // 2. Parse Staff/Coach from infobox or dedicated tables
  $('.infobox-cell-2:contains("Coach"), .infobox-cell-2:contains("Head Coach")').each((i, el) => {
    const nextCell = $(el).next('.infobox-cell-2');
    if (nextCell.length) {
      coach = nextCell.text().trim();
    }
  });
  
  // Fallback for coach in staff tables
  if (!coach) {
    $('.wikitable.staff-table tr, .wikitable tr').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Coach') || text.includes('Head Coach')) {
        coach = $(el).find('td').last().text().trim();
      }
    });
  }

  return {
    players,
    coach,
    lastUpdated: new Date().toISOString()
  };
}
