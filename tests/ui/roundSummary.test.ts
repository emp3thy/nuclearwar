import { describe, it, expect } from 'vitest';
import { pickSubhead } from '../../src/ui/screens/RoundSummary';
import { initialState } from '../../src/engine/state';
import type { ResolutionEvent } from '../../src/engine/types';

describe('pickSubhead', () => {
  const game = initialState({ cast: ['player1', 'carnage'], difficulty: 'normal', seed: 'rs' });

  it('sums multiple strikes from one attacker on one target', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'player1', target: 'carnage', warhead: 'large', deaths: 6 },
      { kind: 'ImpactPeople', from: 'player1', target: 'carnage', warhead: 'large', deaths: 6 },
    ];
    expect(pickSubhead(events, game.leaders)).toContain('for 12M');
  });

  it('names the biggest attacker→target pairing by summed deaths', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'player1', target: 'carnage', warhead: 'small', deaths: 4 },
      { kind: 'ImpactPeople', from: 'player1', target: 'carnage', warhead: 'small', deaths: 4 },
      { kind: 'ImpactPeople', from: 'carnage', target: 'player1', warhead: 'large', deaths: 7 },
    ];
    // player1→carnage totals 8M, beating carnage→player1's single 7M.
    expect(pickSubhead(events, game.leaders)).toContain('for 8M');
  });

  it('reports no casualties when there are no people impacts', () => {
    expect(pickSubhead([], game.leaders)).toBe('No casualties this round.');
  });
});
