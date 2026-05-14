import { describe, expect, it } from 'vitest';
import { apCostOf, validateOrder, validateOrderSequence } from '../../src/engine/orders';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

describe('woo (P4b flat shape)', () => {
  it('apCostOf for woo is 1 (flat)', () => {
    const o: Order = { kind: 'woo', target: 'chump' };
    expect(apCostOf(o)).toBe(1);
  });

  it('validateOrder accepts woo with no points field', () => {
    const s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'woo-shape',
    });
    const o: Order = { kind: 'woo', target: 'chump' };
    expect(validateOrder(s, 'player1', o).ok).toBe(true);
  });

  it('validateOrderSequence rejects a second woo at the same target', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'woo-twice',
    });
    const orders: Order[] = [
      { kind: 'woo', target: 'chump' },
      { kind: 'woo', target: 'chump' },
    ];
    const v = validateOrderSequence(s, 'player1', orders);
    expect(v.ok).toBe(false);
  });

  it('validateOrderSequence rejects a second propaganda at the same target', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'prop-twice',
    });
    const orders: Order[] = [
      { kind: 'propaganda', target: 'chump' },
      { kind: 'propaganda', target: 'chump' },
    ];
    const v = validateOrderSequence(s, 'player1', orders);
    expect(v.ok).toBe(false);
  });
});

describe('deploy-defence', () => {
  it('apCostOf for deploy-defence is 4', () => {
    const o: Order = { kind: 'deploy-defence', type: 'shield' };
    expect(apCostOf(o)).toBe(4);
  });

  it('validateOrder rejects deploy-defence when stockpile shield = 0', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'no-shield',
    });
    const o: Order = { kind: 'deploy-defence', type: 'shield' };
    expect(validateOrder(s, 'player1', o).ok).toBe(false);
  });

  it('validateOrderSequence accepts build-then-deploy in one round (projection)', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'build-then-deploy',
    });
    const orders: Order[] = [
      { kind: 'build-defence', type: 'shield' },
      { kind: 'deploy-defence', type: 'shield' },
    ];
    const v = validateOrderSequence(s, 'player1', orders);
    expect(v.ok).toBe(true);
  });
});
