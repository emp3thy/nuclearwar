import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reducer';
import { initialState } from '../../src/engine/state';
import { scriptedOrders } from '../helpers/scripted-orders';
import type { GameState, LeaderId } from '../../src/engine/types';

function runGame(seed: string, cast: LeaderId[], maxRounds = 80): GameState {
  // dominanceThreshold=1.5 — see Task 17 second test for context. The scripted-orders
  // cycle creates an unbounded shield-stockpile + slow propaganda dynamic that
  // makes 2× dominance require ~150 rounds; 1.5× terminates within ~80.
  let s = initialState({
    cast,
    difficulty: 'normal',
    seed,
    config: { dominanceThreshold: 1.5 },
  });
  while (!s.outcome && s.round <= maxRounds) {
    for (const id of cast) {
      const orders = scriptedOrders(s, id);
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    }
    s = reduce(s, { type: 'RESOLVE_ROUND' });
  }
  return s;
}

describe('determinism', () => {
  it('produces identical state for identical seed across two runs (3-leader)', () => {
    const cast: LeaderId[] = ['chump', 'carnage', 'starmless'];
    const a = runGame('alpha', cast);
    const b = runGame('alpha', cast);
    expect(a).toEqual(b);
  });

  it('produces different final state for different seeds', () => {
    const cast: LeaderId[] = ['chump', 'carnage', 'starmless'];
    const a = runGame('alpha', cast);
    const b = runGame('beta', cast);
    expect(a).not.toEqual(b);
  });

  it('property: 25 random seeds are each deterministic across two runs', () => {
    const cast: LeaderId[] = ['chump', 'carnage', 'starmless'];
    for (let i = 0; i < 25; i++) {
      const seed = `prop-${i}`;
      const a = runGame(seed, cast);
      const b = runGame(seed, cast);
      // Full-log equality: any divergence in event payloads (deaths, intercepts,
      // pop deltas, RNG-driven targets) shows up immediately.
      expect(a.log).toEqual(b.log);
      expect(a.outcome).toEqual(b.outcome);
      expect(a.round).toBe(b.round);
    }
  }, 30_000);
});
