import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reducer';
import { initialState } from '../../src/engine/state';
import { scriptedOrders } from '../helpers/scripted-orders';

describe('integration — three-leader scripted game', () => {
  it('runs at least 5 rounds without error and produces a typed event stream', () => {
    let s = initialState({
      cast: ['chump', 'carnage', 'starmless'],
      difficulty: 'normal',
      seed: 'integration-1',
    });
    for (let round = 0; round < 5 && !s.outcome; round++) {
      for (const id of s.cast) {
        const orders = scriptedOrders(s, id);
        s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
      }
      s = reduce(s, { type: 'RESOLVE_ROUND' });
    }
    expect(s.round).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(s.log)).toBe(true);
    // Every event must be one of the known kinds.
    const known = new Set([
      'OrdersSealed',
      'FactoryBuilt',
      'DeliveryBuilt',
      'WarheadBuilt',
      'DefenceBuilt',
      'MissileLaunched',
      'MissileIntercepted',
      'ImpactPeople',
      'ImpactInfrastructure',
      'PropagandaTransfer',
      'WooApplied',
      'LeaderEliminated',
      'FinalRetaliationTriggered',
      'OutcomeReached',
    ]);
    for (const e of s.log) {
      expect(known.has(e.kind)).toBe(true);
    }
  });

  it('reaches an outcome within 100 rounds for sample seeds', () => {
    for (const seed of ['s1', 's2', 's3']) {
      let s = initialState({
        cast: ['chump', 'carnage', 'starmless'],
        difficulty: 'normal',
        seed,
        // dominanceThreshold=1.5 ensures termination within ~80 rounds with the
        // scripted-orders cycle; default threshold=2 requires ~150 rounds because
        // shields accumulate and propaganda gain is slow.
        config: { dominanceThreshold: 1.5 },
      });
      let rounds = 0;
      while (!s.outcome && rounds < 100) {
        for (const id of s.cast) {
          const orders = scriptedOrders(s, id);
          s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
        }
        s = reduce(s, { type: 'RESOLVE_ROUND' });
        rounds++;
      }
      expect(s.outcome).not.toBeNull();
    }
  });
});
