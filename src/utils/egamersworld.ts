
import * as cheerio from 'cheerio';
import { compareTwoStrings } from 'string-similarity';
import puppeteer from 'puppeteer-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

export interface EGWTeam {
  name: string;
  url: string;
  logo?: string;
  rank?: string;
  score?: number;
}

/**
 * Fetches HTML from EGW using a headless browser to bypass Cloudflare.
 */
export async function fetchEGWHtml(url: string): Promise<string> {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    // Default timeout 30s
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    return html;
  } catch (error) {
    console.error(`Error fetching EGW URL with Puppeteer (${url}):`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function searchEGWTeams(game: string, query: string): Promise<EGWTeam[]> {
  const url = `https://egamersworld.com/${game}/teams`;
  try {
    const html = await fetchEGWHtml(url);
    const $ = cheerio.load(html);
    const teams: EGWTeam[] = [];

    $('.teams-list .team-item, .team-card, .table-row').each((i, el) => {
      const $el = $(el);
      const name = $el.find('.team-name, .name, .title').text().trim();
      const teamUrl = $el.find('a').attr('href');
      const logo = $el.find('img').attr('src');
      
      if (name && teamUrl) {
        const fullUrl = teamUrl.startsWith('http') ? teamUrl : `https://egamersworld.com${teamUrl}`;
        const score = compareTwoStrings(query.toLowerCase(), name.toLowerCase());
        
        if (score > 0.2 || name.toLowerCase().includes(query.toLowerCase())) {
          teams.push({
            name,
            url: fullUrl,
            logo,
            score
          });
        }
      }
    });

    return teams.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
  } catch (error) {
    console.error('Error searching EGW teams:', error);
    return [];
  }
}

export async function getEGWLiveMatches(game: string): Promise<any[]> {
  const url = `https://egamersworld.com/${game}/matches/live`;
  try {
    const html = await fetchEGWHtml(url);
    const $ = cheerio.load(html);
    const matches: any[] = [];

    $('.match-item, .live-match').each((i, el) => {
      const $el = $(el);
      const teamA = $el.find('.team-left .name').text().trim();
      const teamB = $el.find('.team-right .name').text().trim();
      const score = $el.find('.score').text().trim();
      const matchUrl = $el.find('a').attr('href');
      
      if (teamA && teamB) {
        matches.push({
          teamA,
          teamB,
          score,
          url: matchUrl?.startsWith('http') ? matchUrl : `https://egamersworld.com${matchUrl}`
        });
      }
    });

    return matches;
  } catch (error) {
    console.error('Error getting EGW live matches:', error);
    return [];
  }
}
