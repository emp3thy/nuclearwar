import { describe, it, expect } from 'vitest';
import { applyPropaganda } from '../../src/engine/propaganda';
import { initialState } from '../../src/engine/state';
import { PROPAGANDA_TRANSFER_M } from '../../src/engine/balance';
import type { Order } from '../../src/engine/types';

describe('applyPropaganda', () => {
  it('transfers PROPAGANDA_TRANSFER_M from victim to propagandist', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders: Partial<Record<'chump' | 'carnage', Order[]>> = {
      chump: [{ kind: 'propaganda', target: 'carnage' }],
      carnage: [],
    };
    const r = applyPropaganda(s, orders);
    expect(r.state.leaders.chump.population).toBe(33 + PROPAGANDA_TRANSFER_M);
    expect(r.state.leaders.carnage.population).toBe(25 - PROPAGANDA_TRANSFER_M);
    expect(r.events).toEqual([
      { kind: 'PropagandaTransfer', from: 'chump', to: 'carnage', amount: PROPAGANDA_TRANSFER_M },
    ]);
  });

  it('caps transfer at victim’s remaining population', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.population = 0;
    const orders = {
      chump: [{ kind: 'propaganda' as const, target: 'carnage' as const }],
      carnage: [],
    };
    const r = applyPropaganda(s, orders);
    expect(r.events).toHaveLength(0);
    expect(r.state.leaders.chump.population).toBe(33);
  });

  it('skips orders against dead targets', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    const orders = {
      chump: [{ kind: 'propaganda' as const, target: 'carnage' as const }],
      carnage: [],
    };
    const r = applyPropaganda(s, orders);
    expect(r.events).toHaveLength(0);
  });

  it('processes propagandists in deterministic id-ASC order', () => {
    const s = initialState({ cast: ['carnage', 'chump'], difficulty: 'normal', seed: 'x' });
    const orders = {
      chump: [{ kind: 'propaganda' as const, target: 'carnage' as const }],
      carnage: [{ kind: 'propaganda' as const, target: 'chump' as const }],
    };
    const r = applyPropaganda(s, orders);
    expect(r.events[0]).toMatchObject({ from: 'carnage', to: 'chump' });
    expect(r.events[1]).toMatchObject({ from: 'chump', to: 'carnage' });
  });
});
