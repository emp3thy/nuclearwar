import { describe, it, expect } from 'vitest';
import { applyDefenceBuilds, applyOtherBuilds } from '../../src/engine/builds';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

describe('applyDefenceBuilds', () => {
  it('only applies defence builds', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders: Order[] = [
      { kind: 'build-factory' },
      { kind: 'build-defence', type: 'shield' },
      { kind: 'build-defence', type: 'aa' },
    ];
    const r = applyDefenceBuilds(s, 'chump', orders);
    expect(r.state.leaders.chump.stockpile.shields).toBe(1);
    expect(r.state.leaders.chump.stockpile.aa).toBe(1);
    expect(r.state.leaders.chump.factories).toBe(10); // unchanged
    expect(r.events.map((e) => e.kind)).toEqual(['DefenceBuilt', 'DefenceBuilt']);
  });
});

describe('applyOtherBuilds', () => {
  it('applies a build-factory order', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const r = applyOtherBuilds(s, 'chump', [{ kind: 'build-factory' }]);
    expect(r.state.leaders.chump.factories).toBe(11);
    expect(r.events).toEqual([{ kind: 'FactoryBuilt', by: 'chump' }]);
  });

  it('applies stockpile builds in submitted order', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders: Order[] = [
      { kind: 'build-missile' },
      { kind: 'build-bomber' },
      { kind: 'build-warhead', yield: 'small' },
      { kind: 'build-warhead', yield: 'medium' },
      { kind: 'build-warhead', yield: 'large' },
    ];
    const r = applyOtherBuilds(s, 'chump', orders);
    const sp = r.state.leaders.chump.stockpile;
    expect(sp.missiles).toBe(1);
    expect(sp.bombers).toBe(1);
    expect(sp.warheadsSmall).toBe(1);
    expect(sp.warheadsMedium).toBe(1);
    expect(sp.warheadsLarge).toBe(1);
    expect(r.events.map((e) => e.kind)).toEqual([
      'DeliveryBuilt',
      'DeliveryBuilt',
      'WarheadBuilt',
      'WarheadBuilt',
      'WarheadBuilt',
    ]);
  });

  it('ignores defence builds (handled in applyDefenceBuilds)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const r = applyOtherBuilds(s, 'chump', [{ kind: 'build-defence', type: 'shield' }]);
    expect(r.state.leaders.chump.stockpile.shields).toBe(0);
    expect(r.events).toHaveLength(0);
  });

  it('ignores non-build orders', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const r = applyOtherBuilds(s, 'chump', [
      { kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
      { kind: 'propaganda', target: 'carnage' },
    ]);
    expect(r.events).toHaveLength(0);
  });
});
