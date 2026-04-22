import { fetchHtml, fetchJson } from './fetcher';
import * as cheerio from 'cheerio';
import { solvePositions, POSITION_MAP, HeroRoleInfo } from './dota2_roles';

export interface DraftHero {
  hero: string;
  player?: string;
  position?: number;
  role?: string;
}

export interface MatchData {
  teamA: string;
  teamB: string;
  score: string;
  gameTime?: string;
  draft: {
    radiant: DraftHero[];
    dire: DraftHero[];
  };
}

export function enrichDraftWithPositions(draft: DraftHero[], allHeroes: HeroRoleInfo[]): DraftHero[] {
  if (draft.length !== 5) return draft;

  const draftHeroInfos = draft.map(d => {
    // Find the hero by name (case-insensitive, basic matching)
    const h = allHeroes.find(ah => ah.localized_name.toLowerCase() === d.hero.toLowerCase());
    return h || { id: 0, localized_name: d.hero, roles: [] };
  });

  const solvedPositions = solvePositions(draftHeroInfos);

  return draft.map(d => {
    const pos = solvedPositions[d.hero] || d.position;
    return {
      ...d,
      position: pos,
      role: pos ? POSITION_MAP[pos] || d.role : d.role
    };
  }).sort((a, b) => (a.position || 0) - (b.position || 0));
}

export async function parseHawkLiveMatch(url: string): Promise<MatchData | null> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('title').text() || '';
    let teamA = 'Unknown';
    let teamB = 'Unknown';
    
    if (title.includes(' vs ')) {
      [teamA, teamB] = title.split(' vs ').map(t => t.split('|')[0].trim());
    }

    const scoreText = $('.MatchBest .Score').text() || $('.score').text() || '0 - 0';
    const gameTime = $('.GameTime').text() || undefined;
    
    let radiantDraft: DraftHero[] = [];
    let direDraft: DraftHero[] = [];

    // Helper to extract name from hero image
    const getHeroName = (img: any) => {
      const alt = img.attr('alt');
      const src = img.attr('src') || '';
      if (alt) return alt;
      const match = src.match(/npc_dota_hero_([^.]+)/);
      return match ? match[1].replace(/_/g, ' ') : null;
    };

    // Hawk Live typically organizes picks in rows or blocks
    // We'll iterate through all hero picks and attempt to match players
    $('.TeamHeroPick, .hero-icon-container, .PickRow').each((i, el) => {
      const $el = $(el);
      const heroImg = $el.find('img[src*="/heroes/"]');
      if (heroImg.length > 0) {
        const heroName = getHeroName(heroImg);
        // Player name is usually in a sibling or nearby text node
        const playerName = $el.find('.PlayerName, .name, .nickname').text().trim() || 
                           $el.text().replace(heroName || '', '').trim();
        
        const side = $el.closest('.Radiant, .radiant-side').length > 0 || $el.parents().text().toLowerCase().includes('radiant') ? 'radiant' : 'dire';
        
        if (heroName) {
          const draftObj: DraftHero = {
            hero: heroName,
            player: playerName || undefined,
            // Pro trackers usually list in position order 1-5 or 5-1
            position: (side === 'radiant' ? radiantDraft.length : direDraft.length) + 1
          };
          draftObj.role = POSITION_MAP[draftObj.position || 0];
          
          if (side === 'radiant') radiantDraft.push(draftObj);
          else direDraft.push(draftObj);
        }
      }
    });

    // Final Fallback if specialized selectors failed (Direct image search)
    if (radiantDraft.length === 0 && direDraft.length === 0) {
      $('img[src*="/heroes/"]').each((i, el) => {
        const heroName = getHeroName($(el));
        if (heroName) {
          const isRadiant = i < 5;
          const pos = (i % 5) + 1;
          const hero: DraftHero = {
            hero: heroName,
            position: pos,
            role: POSITION_MAP[pos]
          };
          if (isRadiant) radiantDraft.push(hero);
          else direDraft.push(hero);
        }
      });
    }

    try {
      const allHeroes = await fetchJson('https://api.opendota.com/api/heroes');
      radiantDraft = enrichDraftWithPositions(radiantDraft.slice(0, 5), allHeroes);
      direDraft = enrichDraftWithPositions(direDraft.slice(0, 5), allHeroes);
    } catch (e) {
      console.error("Failed to enrich draft roles", e);
      radiantDraft = radiantDraft.slice(0, 5);
      direDraft = direDraft.slice(0, 5);
    }

    return {
      teamA,
      teamB,
      score: scoreText,
      gameTime,
      draft: {
        radiant: radiantDraft,
        dire: direDraft
      }
    };
  } catch (error) {
    console.error('Error parsing Hawk Live:', error);
    return null;
  }
}
