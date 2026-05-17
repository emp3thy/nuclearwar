import { describe, it, expect } from 'vitest';
import { buildToward, type BuildPlanEntry } from '../../../src/engine/ai/aggression';
import { initialState } from '../../../src/engine/state';

describe('buildToward', () => {
  it('builds each plan entry up to its target and no further', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b1' });
    s.leaders.netanyahoo.stockpile.missiles = 0;
    const plan: BuildPlanEntry[] = [{ build: { item: 'missile' }, target: 3 }];
    const r = buildToward(s, 'netanyahoo', plan, 10);
    expect(r.orders.filter((o) => o.kind === 'build-missile')).toHaveLength(3);
    expect(r.apSpent).toBe(3); // build-missile costs 1
  });

  it('counts existing stockpile toward the target', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b2' });
    s.leaders.netanyahoo.stockpile.missiles = 2;
    const plan: BuildPlanEntry[] = [{ build: { item: 'missile' }, target: 3 }];
    const r = buildToward(s, 'netanyahoo', plan, 10);
    expect(r.orders.filter((o) => o.kind === 'build-missile')).toHaveLength(1);
  });

  it('walks entries in priority order and stops at budget exhaustion', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b3' });
    const plan: BuildPlanEntry[] = [
      { build: { item: 'missile' }, target: 5 },
      { build: { item: 'warhead', yield: 'small' }, target: 5 },
    ];
    const r = buildToward(s, 'netanyahoo', plan, 3); // only 3 AP, missile costs 1
    expect(r.orders.filter((o) => o.kind === 'build-missile')).toHaveLength(3);
    expect(r.orders.filter((o) => o.kind === 'build-warhead')).toHaveLength(0);
  });

  it('respects per-yield warhead targets independently', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b4' });
    const plan: BuildPlanEntry[] = [
      { build: { item: 'warhead', yield: 'small' }, target: 2 },
      { build: { item: 'warhead', yield: 'large' }, target: 1 },
    ];
    const r = buildToward(s, 'netanyahoo', plan, 20);
    expect(r.orders.filter((o) => o.kind === 'build-warhead' && o.yield === 'small')).toHaveLength(2);
    expect(r.orders.filter((o) => o.kind === 'build-warhead' && o.yield === 'large')).toHaveLength(1);
    expect(r.apSpent).toBe(2 * 1 + 1 * 3); // small=1, large=3
  });

  it('emits nothing when budget is below the cheapest item cost', () => {
    const s = initialState({ cast: ['starmless', 'chump'], difficulty: 'normal', seed: 'b5' });
    const plan: BuildPlanEntry[] = [{ build: { item: 'factory' }, target: 5 }];
    const r = buildToward(s, 'starmless', plan, 2); // factory costs 3
    expect(r.orders).toHaveLength(0);
    expect(r.apSpent).toBe(0);
  });

  it('emits nothing for an already-satisfied plan', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b6' });
    s.leaders.netanyahoo.stockpile.missiles = 9;
    const plan: BuildPlanEntry[] = [{ build: { item: 'missile' }, target: 3 }];
    const r = buildToward(s, 'netanyahoo', plan, 10);
    expect(r.orders).toHaveLength(0);
  });

  it('builds bombers and defences from the plan', () => {
    const s = initialState({ cast: ['carnage', 'chump'], difficulty: 'normal', seed: 'b7' });
    const plan: BuildPlanEntry[] = [
      { build: { item: 'bomber' }, target: 1 },
      { build: { item: 'defence', type: 'shield' }, target: 1 },
    ];
    const r = buildToward(s, 'carnage', plan, 20);
    expect(r.orders.filter((o) => o.kind === 'build-bomber')).toHaveLength(1);
    expect(r.orders.filter((o) => o.kind === 'build-defence')).toHaveLength(1);
  });

  it('emits nothing for a dead leader', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b8' });
    s.leaders.netanyahoo.alive = false;
    s.leaders.netanyahoo.population = 0;
    const plan: BuildPlanEntry[] = [{ build: { item: 'missile' }, target: 3 }];
    const r = buildToward(s, 'netanyahoo', plan, 10);
    expect(r.orders).toHaveLength(0);
    expect(r.apSpent).toBe(0);
  });
});
