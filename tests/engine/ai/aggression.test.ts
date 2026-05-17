import { describe, it, expect } from 'vitest';
import { buildToward, launchSalvo, type BuildPlanEntry } from '../../../src/engine/ai/aggression';
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

describe('launchSalvo', () => {
  it('fires until AP and ammo run out when no cap is given', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l1' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 3;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['chump'] });
    expect(r.orders).toHaveLength(3); // 3 missile+warhead pairs
    expect(r.apSpent).toBe(6); // launch costs 2
  });

  it('honours maxLaunches', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l2' });
    s.leaders.netanyahoo.stockpile.missiles = 5;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 5;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['chump'], maxLaunches: 2 });
    expect(r.orders).toHaveLength(2);
  });

  it('stops when budget cannot cover another launch', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l3' });
    s.leaders.netanyahoo.stockpile.missiles = 5;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 5;
    const r = launchSalvo(s, 'netanyahoo', { budget: 5, rankedTargets: ['chump'] });
    expect(r.orders).toHaveLength(2); // 5 AP / 2 per launch = 2
  });

  it('pairs largest-yield warheads first', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l4' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s.leaders.netanyahoo.stockpile.warheadsMedium = 1;
    s.leaders.netanyahoo.stockpile.warheadsLarge = 1;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['chump'] });
    const yields = r.orders.map((o) => (o.kind === 'launch' ? o.warhead : null));
    expect(yields).toEqual(['large', 'medium', 'small']);
  });

  it('prefers bomber delivery when a bomber is in stock', () => {
    const s = initialState({ cast: ['carnage', 'chump'], difficulty: 'normal', seed: 'l5' });
    s.leaders.carnage.stockpile.bombers = 1;
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 2;
    const r = launchSalvo(s, 'carnage', { budget: 100, rankedTargets: ['chump'] });
    expect(r.orders).toHaveLength(2);
    if (r.orders[0].kind === 'launch') expect(r.orders[0].delivery).toBe('bomber');
    if (r.orders[1].kind === 'launch') expect(r.orders[1].delivery).toBe('missile');
  });

  it('focus-fires rankedTargets[0] by default', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump', 'carnage'], difficulty: 'normal', seed: 'l6' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 3;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['carnage', 'chump'] });
    expect(r.orders.every((o) => o.kind === 'launch' && o.target === 'carnage')).toBe(true);
  });

  it('cycles targets when spread is true', () => {
    const s = initialState({ cast: ['mileigh-hem', 'chump', 'carnage'], difficulty: 'normal', seed: 'l7' });
    s.leaders['mileigh-hem'].stockpile.missiles = 4;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 4;
    const r = launchSalvo(s, 'mileigh-hem', { budget: 100, rankedTargets: ['chump', 'carnage'], spread: true });
    const targets = r.orders.map((o) => (o.kind === 'launch' ? o.target : null));
    expect(targets).toEqual(['chump', 'carnage', 'chump', 'carnage']);
  });

  it('never emits more launches than the projected stockpile can arm', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l8' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 5;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['chump'] });
    expect(r.orders).toHaveLength(1); // only 1 delivery vehicle
  });

  it('returns nothing for empty rankedTargets', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l9' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 3;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: [] });
    expect(r.orders).toHaveLength(0);
    expect(r.apSpent).toBe(0);
  });

  it('respects the targetTypeFor selector', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'l10' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const r = launchSalvo(s, 'chump', {
      budget: 100, rankedTargets: ['carnage'], targetTypeFor: () => 'infra',
    });
    expect(r.orders[0].kind === 'launch' && r.orders[0].targetType).toBe('infra');
  });
});
