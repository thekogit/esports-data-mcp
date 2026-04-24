import { fetchHtml } from './fetcher';
import * as cheerio from 'cheerio';

export interface Player {
  id: string;
  name?: string;
}

export interface Roster {
  players: Player[];
  coach: string | null;
  lastUpdated: string;
}

export interface Tournament {
  tier: string;
  name: string;
  dates: string;
}

export async function getLiquipediaTournaments(game: string): Promise<Tournament[]> {
  const url = `https://liquipedia.net/${game}/Portal:Tournaments`;
  const html = await fetchHtml(url).catch(() => null);
  if (!html) return [];
  const $ = cheerio.load(html);
  const tournaments: Tournament[] = [];
  
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
      const name = $(el).find('.Tournament, .divCell:nth-child(2)').text().trim();
      const dates = $(el).find('.Date, .divCell:nth-child(3)').text().trim();
      const tier = $(el).find('.Tier, .divCell:nth-child(1)').text().trim();
      
      if (name) {
        tournaments.push({ name, dates, tier });
      }
    });
  }

  return tournaments.filter(t => t.name);
}

export async function getLiquipediaRoster(game: string, teamName: string): Promise<Roster> {
  const url = `https://liquipedia.net/${game}/${teamName}`;
  const html = await fetchHtml(url).catch(() => null);
  if (!html) return { players: [], coach: null, lastUpdated: new Date().toISOString() };
  const $ = cheerio.load(html);
  
  const players: Player[] = [];
  let coach: string | null = null;

  // 1. Parse Team Card Layout
  $('.teamcard-inner .player').each((i, el) => {
    const id = $(el).text().trim();
    if (id && !players.some(p => p.id === id)) {
      players.push({ id });
    }
  });

  // 2. Parse Roster Table Layout (more robust, avoids headers, captures real names)
  $('.wikitable.roster-table tr, .wikitable.table-roster tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 2) {
      const idElement = $(cells[0]).find('.player');
      const id = idElement.length ? idElement.text().trim() : $(cells[0]).text().trim();
      const realName = $(cells[1]).text().trim();

      if (id && id !== 'ID') {
        const existingPlayer = players.find(p => p.id === id);
        if (existingPlayer) {
          if (realName && !existingPlayer.name) {
            existingPlayer.name = realName;
          }
        } else {
          players.push({
            id,
            name: realName || undefined
          });
        }
      }
    }
  });

  // 3. Parse Staff/Coach from infobox or dedicated tables
  $('.infobox-cell-2:contains("Coach"), .infobox-cell-2:contains("Head Coach")').each((i, el) => {
    const nextCell = $(el).next('.infobox-cell-2');
    if (nextCell.length) {
      coach = nextCell.text().trim();
    }
  });
  
  // Fallback for coach in staff tables
  if (!coach) {
    $('.wikitable.staff-table tr, .wikitable tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const role = $(cells[0]).text().trim();
        const name = $(cells[1]).text().trim();
        if (role.includes('Coach') || role.includes('Head Coach')) {
          coach = name;
        }
      }
    });
  }

  return {
    players: players.filter(p => p.id),
    coach,
    lastUpdated: new Date().toISOString()
  };
}
