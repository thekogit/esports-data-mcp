export interface HeroRoleInfo {
  id: number;
  localized_name: string;
  roles: string[];
}

export const POSITION_MAP: Record<number, string> = {
  1: 'Carry',
  2: 'Mid',
  3: 'Offlane',
  4: 'Soft Support',
  5: 'Hard Support'
};

// Simplified scoring logic based on typical Dota 2 role combinations
function scoreAssignment(hero: HeroRoleInfo, position: number): number {
  let score = 0;
  const roles = hero.roles.map(r => r.toLowerCase());
  
  if (position === 1) { // Carry
    if (roles.includes('carry')) score += 20;
    else score -= 20;
  } else if (position === 2) { // Mid
    if (roles.includes('nuker')) score += 10;
    if (roles.includes('escape')) score += 5;
    if (roles.includes('carry')) score += 2;
  } else if (position === 3) { // Offlane
    if (roles.includes('initiator')) score += 10;
    if (roles.includes('durable')) score += 5;
  } else if (position === 4) { // Soft Support
    if (roles.includes('support')) score += 5;
    if (roles.includes('nuker')) score += 5;
    if (roles.includes('disabler')) score += 5;
  } else if (position === 5) { // Hard Support
    if (roles.includes('support')) score += 15;
    if (roles.includes('disabler')) score += 5;
  }

  // Hardcode some known primary roles to resolve ties like Slardar vs Void
  const name = hero.localized_name.toLowerCase();
  if (position === 1 && (name === 'faceless void' || name === 'phantom assassin' || name === 'anti-mage' || name === 'terrorblade')) {
    score += 30; // Hard carry
  }
  if (position === 3 && (name === 'slardar' || name === 'axe' || name === 'centaur warrunner' || name === 'tidehunter')) {
    score += 30; // Hard offlane
  }

  return score;
}

// Generate permutations of [1, 2, 3, 4, 5]
function getPermutations(arr: number[]): number[][] {
  if (arr.length === 0) return [[]];
  const result: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    const remainingPerms = getPermutations(remaining);
    for (const perm of remainingPerms) {
      result.push([current].concat(perm));
    }
  }
  return result;
}

export function solvePositions(heroes: HeroRoleInfo[]): Record<string, number> {
  if (heroes.length !== 5) {
    // If not exactly 5 heroes, just return their current index + 1 as a fallback
    return heroes.reduce((acc, h, i) => ({ ...acc, [h.localized_name]: i + 1 }), {});
  }

  const perms = getPermutations([1, 2, 3, 4, 5]);
  let bestScore = -Infinity;
  let bestPerm: number[] = [1, 2, 3, 4, 5];

  for (const perm of perms) {
    let currentScore = 0;
    for (let i = 0; i < 5; i++) {
      currentScore += scoreAssignment(heroes[i], perm[i]);
    }
    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestPerm = perm;
    }
  }

  const result: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    result[heroes[i].localized_name] = bestPerm[i];
  }
  return result;
}
