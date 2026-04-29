export enum EsportsGame {
  DOTA2 = 'DOTA2',
  CS2 = 'CS2',
  LOL = 'LOL',
  VALO = 'VALO',
  MARVEL_RIVALS = 'MARVEL_RIVALS',
  OVERWATCH = 'OVERWATCH'
}

export enum EsportsRole {
  // Dota 2 / LoL
  POSITION_1 = 'POSITION_1', // Carry / ADC
  POSITION_2 = 'POSITION_2', // Mid
  POSITION_3 = 'POSITION_3', // Offlane / Top
  POSITION_4 = 'POSITION_4', // Soft Support / Jungle
  POSITION_5 = 'POSITION_5', // Hard Support / Support
  
  // CS2 / Valo (Tactical Shooter)
  IGL = 'IGL',
  AWPER = 'AWPER',
  ENTRY = 'ENTRY',
  SUPPORT = 'SUPPORT',
  LURKER = 'LURKER',
  
  // Overwatch / Marvel Rivals
  TANK = 'TANK',
  DPS = 'DPS',
  HEALER = 'HEALER',
  
  UNKNOWN = 'UNKNOWN'
}

export interface NormalizedPlayer {
  name: string;
  role: EsportsRole;
  hero?: string; // or Champion/Agent/Character
  stats?: Record<string, number>;
}

export interface NormalizedTeam {
  name: string;
  players: NormalizedPlayer[];
  score?: number;
}

export interface NormalizedMatch {
  game: EsportsGame;
  teamA: NormalizedTeam;
  teamB: NormalizedTeam;
  startTime?: string;
  id?: string;
  prediction?: {
    winner: 'teamA' | 'teamB';
    probability: number;
    reasoning?: string;
  };
}

export function normalizeRole(role: string, game: EsportsGame): EsportsRole {
  const normalized = role.toLowerCase().trim();
  
  if (game === EsportsGame.DOTA2) {
    if (['1', 'pos 1', 'position 1', 'carry', 'hard carry'].includes(normalized)) return EsportsRole.POSITION_1;
    if (['2', 'pos 2', 'position 2', 'mid', 'middle', 'midlane'].includes(normalized)) return EsportsRole.POSITION_2;
    if (['3', 'pos 3', 'position 3', 'offlane', 'offlaner'].includes(normalized)) return EsportsRole.POSITION_3;
    if (['4', 'pos 4', 'position 4', 'soft support', 'roamer'].includes(normalized)) return EsportsRole.POSITION_4;
    if (['5', 'pos 5', 'position 5', 'hard support', 'full support', 'support'].includes(normalized)) return EsportsRole.POSITION_5;
  }
  
  if (game === EsportsGame.LOL) {
    if (['adc', 'bot', 'bottom', 'marksman'].includes(normalized)) return EsportsRole.POSITION_1;
    if (['mid', 'middle', 'midlane'].includes(normalized)) return EsportsRole.POSITION_2;
    if (['top', 'toplane'].includes(normalized)) return EsportsRole.POSITION_3;
    if (['jungle', 'jg'].includes(normalized)) return EsportsRole.POSITION_4;
    if (['support', 'sup'].includes(normalized)) return EsportsRole.POSITION_5;
  }
  
  if (game === EsportsGame.CS2 || game === EsportsGame.VALO) {
    if (['igl', 'leader', 'captain'].includes(normalized)) return EsportsRole.IGL;
    if (['awp', 'awper', 'sniper'].includes(normalized)) return EsportsRole.AWPER;
    if (['entry', 'fragger', 'opener'].includes(normalized)) return EsportsRole.ENTRY;
    if (['support', 'util'].includes(normalized)) return EsportsRole.SUPPORT;
    if (['lurk', 'lurker'].includes(normalized)) return EsportsRole.LURKER;
  }
  
  if (game === EsportsGame.OVERWATCH || game === EsportsGame.MARVEL_RIVALS) {
    if (['tank', 'shield', 'frontline'].includes(normalized)) return EsportsRole.TANK;
    if (['dps', 'damage', 'attacker'].includes(normalized)) return EsportsRole.DPS;
    if (['healer', 'support', 'medic'].includes(normalized)) return EsportsRole.HEALER;
  }

  return EsportsRole.UNKNOWN;
}

const KNOWN_PLAYER_ROLES: Record<string, EsportsRole[]> = {
  'nisha': [EsportsRole.POSITION_2, EsportsRole.POSITION_1],
  'micke': [EsportsRole.POSITION_1, EsportsRole.POSITION_2],
  '33': [EsportsRole.POSITION_3],
  'boxi': [EsportsRole.POSITION_4],
  'insania': [EsportsRole.POSITION_5],
  'dyrachyo': [EsportsRole.POSITION_1],
  'quinn': [EsportsRole.POSITION_2],
  'ace': [EsportsRole.POSITION_3],
  'tofu': [EsportsRole.POSITION_4],
  'seleri': [EsportsRole.POSITION_5],
  'faker': [EsportsRole.POSITION_2],
  'caps': [EsportsRole.POSITION_2],
  'zywoo': [EsportsRole.AWPER],
  's1mple': [EsportsRole.AWPER, EsportsRole.ENTRY],
  'niko': [EsportsRole.ENTRY, EsportsRole.LURKER]
};

export function validateMatch(match: NormalizedMatch): string[] {
  const errors: string[] = [];
  
  if (!match.game) errors.push('Missing game type');
  if (!match.teamA?.name) errors.push('Missing Team A name');
  if (!match.teamB?.name) errors.push('Missing Team B name');
  
  const validateTeam = (team: NormalizedTeam, label: string) => {
    if (!team.players || team.players.length === 0) {
      return;
    }
    
    // Check for duplicate roles in MOBA
    if ([EsportsGame.DOTA2, EsportsGame.LOL].includes(match.game)) {
      const roles = team.players.map(p => p.role).filter(r => r !== EsportsRole.UNKNOWN);
      const uniqueRoles = new Set(roles);
      if (roles.length !== uniqueRoles.size) {
        errors.push(`${label} has duplicate roles`);
      }
    }

    // Known player role validation
    for (const player of team.players) {
      const name = player.name.toLowerCase();
      if (KNOWN_PLAYER_ROLES[name]) {
        if (!KNOWN_PLAYER_ROLES[name].includes(player.role) && player.role !== EsportsRole.UNKNOWN) {
          errors.push(`${label}: Player ${player.name} is assigned role ${player.role}, but is known for ${KNOWN_PLAYER_ROLES[name].join('/')}`);
        }
      }
    }
  };
  
  if (match.teamA) validateTeam(match.teamA, 'Team A');
  if (match.teamB) validateTeam(match.teamB, 'Team B');
  
  return errors;
}
