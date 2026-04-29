import { fetchHtml } from './fetcher';
import * as cheerio from 'cheerio';
import { HLTV } from 'hltv';
import { MatchData, DraftHero } from './hawk_live';

export async function parseVlrMatch(url: string): Promise<MatchData | null> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    let teamA = $('.match-header-link-name').eq(0).find('div').eq(0).text().trim();
    let teamB = $('.match-header-link-name').eq(1).find('div').eq(0).text().trim();
    
    // Sometimes there are multiple maps, we extract the first completed or active map
    const maps = $('.vm-stats-game');
    let teamADraft: DraftHero[] = [];
    let teamBDraft: DraftHero[] = [];
    
    // Use the first map for the overall match draft representation
    if (maps.length > 0) {
      const firstMap = maps.eq(0);
      let teamAAbbr = '';
      
      firstMap.find('.wf-table-inset tbody tr').each((j, row) => {
         const player = $(row).find('.mod-player .text-of').text().trim();
         const team = $(row).find('.mod-player .ge-text-light').text().trim();
         const agentImg = $(row).find('.mod-agents img').attr('src');
         
         let agent = 'Unknown';
         if (agentImg) {
           const parts = agentImg.split('/');
           agent = parts[parts.length - 1].replace('.png', '');
         }

         if (!teamAAbbr && team) {
           teamAAbbr = team; // The first team encountered in the table is Team A
         }
         
         const draftObj: DraftHero = {
           hero: agent,
           player: player,
         };
         
         if (team === teamAAbbr) {
           teamADraft.push(draftObj);
         } else {
           teamBDraft.push(draftObj);
         }
      });
    }

    return {
      teamA: teamA || 'Team A',
      teamB: teamB || 'Team B',
      score: $('.match-header-vs-score').text().trim().replace(/\s+/g, ' ') || '0 - 0',
      draft: {
        radiant: teamADraft, // Radiant = Team A
        dire: teamBDraft     // Dire = Team B
      }
    };
  } catch (error) {
    console.error('Error parsing VLR match:', error);
    return null;
  }
}

export async function parseHltvMatch(url: string): Promise<MatchData | null> {
  try {
    const matchIdStr = url.match(/\/matches\/(\d+)\//)?.[1];
    if (!matchIdStr) throw new Error("Invalid HLTV match URL");
    
    const match = await HLTV.getMatch({ id: parseInt(matchIdStr, 10) });
    
    let teamA = match.team1?.name || 'Unknown';
    let teamB = match.team2?.name || 'Unknown';
    
    let teamADraft: DraftHero[] = [];
    let teamBDraft: DraftHero[] = [];

    // Map players to DraftHero. CS2 doesn't have "heroes", so we just map the player names
    if (match.players?.team1) {
      match.players.team1.forEach((p: any) => {
        teamADraft.push({
          hero: 'CS2_Player',
          player: p.name
        });
      });
    }

    if (match.players?.team2) {
      match.players.team2.forEach((p: any) => {
        teamBDraft.push({
          hero: 'CS2_Player',
          player: p.name
        });
      });
    }

    // Attempt to extract the map played
    let playedMap = '';
    if (match.maps && match.maps.length > 0) {
      const firstMap = match.maps.find(m => m.result);
      if (firstMap) {
        playedMap = firstMap.name;
      }
    }

    return {
      teamA,
      teamB,
      score: match.title || '0 - 0',
      draft: {
        radiant: teamADraft,
        dire: teamBDraft
      }
    };
  } catch (error) {
    console.error('Error parsing HLTV match:', error);
    return null;
  }
}

export async function parseGolMatch(url: string): Promise<MatchData | null> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    // In gol.gg, blue side and red side are well defined
    const blueTeam = $('.blue-line-header a').text().trim() || 'Blue Team';
    const redTeam = $('.red-line-header a').text().trim() || 'Red Team';
    
    let teamADraft: DraftHero[] = [];
    let teamBDraft: DraftHero[] = [];
    
    // Players/Champs
    $('.row.pb-1').each((i, row) => {
      const bluePlayer = $(row).find('.text-right a').text().trim();
      const blueChampImg = $(row).find('img').first().attr('alt');
      const redChampImg = $(row).find('img').last().attr('alt');
      const redPlayer = $(row).find('.text-left a').text().trim();
      
      if (blueChampImg && !blueChampImg.includes('Spell') && !blueChampImg.includes('Item')) {
         teamADraft.push({ player: bluePlayer, hero: blueChampImg.replace('.png', '') });
      }
      if (redChampImg && !redChampImg.includes('Spell') && !redChampImg.includes('Item')) {
         teamBDraft.push({ player: redPlayer, hero: redChampImg.replace('.png', '') });
      }
    });

    return {
      teamA: blueTeam,
      teamB: redTeam,
      score: '0 - 0', // Usually not clearly scraped from this specific sub-page
      draft: {
        radiant: teamADraft, // Radiant = Blue
        dire: teamBDraft     // Dire = Red
      }
    };
  } catch (error) {
    console.error('Error parsing GOL match:', error);
    return null;
  }
}

