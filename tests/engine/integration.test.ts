import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reducer';
import { initialState } from '../../src/engine/state';
import { planAi } from '../../src/engine/ai';
import { scriptedOrders } from '../helpers/scripted-orders';

describe('integration — three-leader scripted game', () => {
  it('runs at least 5 rounds without error and produces a typed event stream', () => {
    let s = initialState({
      cast: ['chump', 'carnage', 'burnem'],
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
      // P4a flavor events
      'PreRoundMood',
      'PostRoundReaction',
      'DisparageCameo',
      'DisparageColumn',
    ]);
    for (const e of s.log) {
      expect(known.has(e.kind)).toBe(true);
    }
  });

  it('runs a mixed-cast round end-to-end (player1 + 2 AI), and persists orderHistory', () => {
    let s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'p25-integration',
      config: {
        playerProfiles: {
          player1: { name: 'Tony', country: '🇮🇹 Italy' },
        },
      },
    });
    // Sanity: player overrides applied; orderHistory empty at game start.
    expect(s.leaders.player1.name).toBe('Tony');
    expect(s.orderHistory).toEqual([]);

    // Human submits orders directly.
    const playerOrders = [{ kind: 'build-factory' as const }];
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'player1',
      orders: playerOrders,
    });
    expect(s.pendingOrders.player1?.orders).toHaveLength(1);

    // AI leaders use planAi.
    for (const id of ['chump', 'carnage'] as const) {
      const orders = planAi(s, id);
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    }

    // Resolve the round; should not throw, should advance round counter,
    // clear pendingOrders, and append to orderHistory.
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    expect(s.round).toBe(2);
    expect(s.pendingOrders).toEqual({});
    expect(s.orderHistory).toHaveLength(1);
    expect(s.orderHistory[0].player1).toEqual(playerOrders);
    expect(s.orderHistory[0].chump).toBeDefined();
    expect(s.orderHistory[0].carnage).toBeDefined();
  });
});
