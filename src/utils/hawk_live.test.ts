import { enrichDraftWithPositions } from './hawk_live';

describe('enrichDraftWithPositions', () => {
  it('correctly assigns positions using solver', () => {
    const draft = [
      { hero: 'Techies', position: 1, role: 'Carry' }, // Incorrect initial parse
      { hero: 'Faceless Void', position: 5, role: 'Hard Support' }
    ];
    const heroes = [
      { id: 105, localized_name: 'Techies', roles: ['Nuker', 'Disabler'] },
      { id: 41, localized_name: 'Faceless Void', roles: ['Carry', 'Initiator', 'Disabler', 'Escape', 'Durable'] }
    ];
    // Pad to 5 for solver
    const fullDraft = [
      ...draft,
      { hero: 'Disruptor' }, { hero: 'Slardar' }, { hero: 'Axe' }
    ];
    const fullHeroes = [
      ...heroes,
      { id: 87, localized_name: 'Disruptor', roles: ['Support'] },
      { id: 28, localized_name: 'Slardar', roles: ['Offlane'] },
      { id: 2, localized_name: 'Axe', roles: ['Offlane'] }
    ];

    const enriched = enrichDraftWithPositions(fullDraft, fullHeroes);
    const voidPick = enriched.find(d => d.hero === 'Faceless Void');
    expect(voidPick?.position).toBe(1);
    expect(voidPick?.role).toBe('Carry');
  });
});
