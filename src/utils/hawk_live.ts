import { fetchHtml, fetchJson } from './fetcher';
import * as cheerio from 'cheerio';
import { solvePositions, POSITION_MAP, HeroRoleInfo } from './dota2_roles';
import fallbackHeroes from './heroes.json';

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

    let teamA = 'Unknown';
    let teamB = 'Unknown';
    const scoreText = $('.MatchBest .Score').text() || $('.score').text() || '0 - 0';
    const gameTime = $('.GameTime').text() || undefined;
    
    let radiantDraft: DraftHero[] = [];
    let direDraft: DraftHero[] = [];

    // 1. Try to parse Inertia.js JSON payload (Gold Standard for Hawk Live)
    const dataPageStr = $('#app').attr('data-page');
    let parsedFromInertia = false;

    if (dataPageStr) {
      try {
        const data = JSON.parse(dataPageStr);
        const props = data.props;
        
        if (props.seriesPageData) {
          const series = props.seriesPageData;
          const t1Name = series.team1?.name || 'Unknown';
          const t2Name = series.team2?.name || 'Unknown';
          
          if (series.matches && series.matches.length > 0) {
            const matches = series.matches;
            const m = matches[matches.length - 1]; // Pick the latest/current match
            
            // Align team names: Team A -> Radiant, Team B -> Dire
            if (m.isTeam1Radiant === false) {
              teamA = t2Name;
              teamB = t1Name;
            } else {
              teamA = t1Name;
              teamB = t2Name;
            }
            
            if (m.picks && Array.isArray(m.picks)) {
              m.picks.forEach((p: any) => {
                const heroName = p.hero?.name;
                if (!heroName) return;
                
                const isRadiant = p.isRadiant;
                const draftObj: DraftHero = {
                  hero: heroName,
                  player: p.player?.name || p.player?.nickname || undefined,
                  position: (isRadiant ? radiantDraft.length : direDraft.length) + 1
                };
                draftObj.role = POSITION_MAP[draftObj.position || 0];
                
                if (isRadiant) radiantDraft.push(draftObj);
                else direDraft.push(draftObj);
              });
              parsedFromInertia = true;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse Hawk Live Inertia JSON:', err);
      }
    }

    // 2. Fallback to DOM parsing if Inertia failed
    if (!parsedFromInertia) {
      const title = $('title').text() || '';
      let titleTeamA = 'Unknown';
      let titleTeamB = 'Unknown';
      if (title.includes(' vs ')) {
        [titleTeamA, titleTeamB] = title.split(' vs ').map(t => t.split('|')[0].replace(/live score and stats/i, '').trim());
      }

      const getHeroName = (img: any) => {
        const alt = img.attr('alt');
        const src = img.attr('src') || '';
        if (alt) return alt;
        const match = src.match(/npc_dota_hero_([^.]+)/);
        return match ? match[1].replace(/_/g, ' ') : null;
      };

      let radiantFound = false;
      let direFound = false;

      $('.TeamHeroPick, .hero-icon-container, .PickRow').each((i, el) => {
        const $el = $(el);
        const heroImg = $el.find('img[src*="/heroes/"]');
        if (heroImg.length > 0) {
          const heroName = getHeroName(heroImg);
          const playerName = $el.find('.PlayerName, .name, .nickname').text().trim() || 
                             $el.text().replace(heroName || '', '').trim();
          
          const isRadiantElement = $el.closest('.Radiant, .radiant-side').length > 0 || $el.parents().text().toLowerCase().includes('radiant');
          const side = isRadiantElement ? 'radiant' : 'dire';
          
          if (heroName) {
            const draftObj: DraftHero = {
              hero: heroName,
              player: playerName || undefined,
              position: (side === 'radiant' ? radiantDraft.length : direDraft.length) + 1
            };
            draftObj.role = POSITION_MAP[draftObj.position || 0];
            
            if (side === 'radiant') {
              radiantDraft.push(draftObj);
              radiantFound = true;
            } else {
              direDraft.push(draftObj);
              direFound = true;
            }
          }
        }
      });

      // Try to determine which team is which side from the DOM if possible
      // This is a bit speculative but often teams are in specific containers
      const radiantContainerText = $('.Radiant, .radiant-side, .team-radiant').text().toLowerCase();
      if (radiantContainerText.includes(titleTeamA.toLowerCase())) {
        teamA = titleTeamA;
        teamB = titleTeamB;
      } else if (radiantContainerText.includes(titleTeamB.toLowerCase())) {
        teamA = titleTeamB;
        teamB = titleTeamA;
      } else {
        // Default to title order if we can't tell, but this is where the swap happens
        teamA = titleTeamA;
        teamB = titleTeamB;
      }

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
    }

    try {
      const allHeroes = await fetchJson('https://api.opendota.com/api/heroes');
      radiantDraft = enrichDraftWithPositions(radiantDraft.slice(0, 5), allHeroes);
      direDraft = enrichDraftWithPositions(direDraft.slice(0, 5), allHeroes);
    } catch (e) {
      console.warn("Failed to fetch heroes from OpenDota for enrichment, using local fallback:", e instanceof Error ? e.message : String(e));
      radiantDraft = enrichDraftWithPositions(radiantDraft.slice(0, 5), fallbackHeroes as HeroRoleInfo[]);
      direDraft = enrichDraftWithPositions(direDraft.slice(0, 5), fallbackHeroes as HeroRoleInfo[]);
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
