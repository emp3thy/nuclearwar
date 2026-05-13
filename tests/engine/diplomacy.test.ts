import { describe, it, expect } from 'vitest';
import { applyWooing, decayFavourability } from '../../src/engine/diplomacy';
import { initialState } from '../../src/engine/state';
import { WOO_FAVOURABILITY_DECAY } from '../../src/engine/balance';
import type { Order } from '../../src/engine/types';

describe('applyWooing', () => {
  it('adds 1 favourability point to target.favourability[sender] (flat woo, P4b)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders: Partial<Record<'chump' | 'carnage', Order[]>> = {
      chump: [{ kind: 'woo', target: 'carnage' }],
      carnage: [],
    };
    const r = applyWooing(s, orders);
    expect(r.state.leaders.carnage.favourability.chump).toBe(1);
    expect(r.events).toEqual([{ kind: 'WooApplied', from: 'chump', to: 'carnage', points: 1 }]);
  });

  it('accumulates across multiple woo orders (1 point each)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.favourability.chump = 2;
    const orders = {
      chump: [{ kind: 'woo' as const, target: 'carnage' as const }],
      carnage: [],
    };
    const r = applyWooing(s, orders);
    expect(r.state.leaders.carnage.favourability.chump).toBe(3);
  });

  it('skips wooing dead targets', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.alive = false;
    const orders = {
      chump: [{ kind: 'woo' as const, target: 'carnage' as const }],
      carnage: [],
    };
    const r = applyWooing(s, orders);
    expect(r.events).toHaveLength(0);
  });
});

describe('decayFavourability', () => {
  it('reduces every favourability entry by WOO_FAVOURABILITY_DECAY, floored at 0', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.favourability.chump = 5;
    s.leaders.chump.favourability.carnage = 1;
    const r = decayFavourability(s);
    expect(r.leaders.carnage.favourability.chump).toBe(5 - WOO_FAVOURABILITY_DECAY);
    expect(r.leaders.chump.favourability.carnage).toBe(0);
  });
});
