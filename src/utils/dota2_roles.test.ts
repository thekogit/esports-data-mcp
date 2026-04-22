import { solvePositions, POSITION_MAP } from './dota2_roles';

describe('solvePositions', () => {
  it('correctly assigns roles for Nemiga Gaming draft', () => {
    // Nemiga Gaming (Techies, Disruptor, Slardar, Axe, Faceless Void)
    const heroes = [
      { id: 105, localized_name: 'Techies', roles: ['Nuker', 'Disabler'] }, // Often 4/5
      { id: 87, localized_name: 'Disruptor', roles: ['Support', 'Disabler', 'Nuker', 'Initiator'] }, // Often 5
      { id: 28, localized_name: 'Slardar', roles: ['Carry', 'Durable', 'Initiator', 'Disabler', 'Escape'] }, // Often 3
      { id: 2, localized_name: 'Axe', roles: ['Initiator', 'Durable', 'Disabler', 'Carry'] }, // Often 3/4
      { id: 41, localized_name: 'Faceless Void', roles: ['Carry', 'Initiator', 'Disabler', 'Escape', 'Durable'] } // Carry
    ];

    const positions = solvePositions(heroes);

    expect(positions['Faceless Void']).toBe(1); // Carry
    // The exact distribution of the others might vary slightly based on scoring, but Void MUST be 1.
    // Slardar or Axe should be 3.
    expect(positions['Slardar'] === 3 || positions['Axe'] === 3).toBe(true);
  });
});
