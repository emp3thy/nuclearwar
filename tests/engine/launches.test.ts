import { describe, it, expect } from 'vitest';
import { applyLaunches, collectLaunches, consumeStockFor } from '../../src/engine/launches';
import { initialState } from '../../src/engine/state';
import type { Launch, Order } from '../../src/engine/types';

const smallLaunch: Launch = {
  from: 'chump',
  to: 'carnage',
  delivery: 'missile',
  warhead: 'small',
  targetType: 'people',
};

describe('collectLaunches', () => {
  it('emits launches in attacker id-ASC order', () => {
    const orders = {
      chump: [{
        kind: 'launch' as const,
        target: 'carnage' as const,
        delivery: 'missile' as const,
        warhead: 'small' as const,
        targetType: 'people' as const,
      }],
      carnage: [{
        kind: 'launch' as const,
        target: 'chump' as const,
        delivery: 'missile' as const,
        warhead: 'small' as const,
        targetType: 'people' as const,
      }],
    };
    const launches = collectLaunches(orders);
    expect(launches[0].from).toBe('carnage'); // 'carnage' < 'chump' alphabetically
    expect(launches[1].from).toBe('chump');
  });

  it('skips non-launch orders', () => {
    const orders: Partial<Record<'chump' | 'carnage', Order[]>> = {
      chump: [{ kind: 'build-factory' }, { kind: 'propaganda', target: 'carnage' }],
    };
    expect(collectLaunches(orders)).toHaveLength(0);
  });
});

describe('consumeStockFor', () => {
  it('consumes one missile + one warhead-S per valid launch and returns it', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const r = consumeStockFor(s, [smallLaunch]);
    expect(r.state.leaders.chump.stockpile.missiles).toBe(0);
    expect(r.state.leaders.chump.stockpile.warheadsSmall).toBe(0);
    expect(r.validLaunches).toHaveLength(1);
  });

  it('drops launches when attacker has no delivery and does not consume stock', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.warheadsSmall = 1;
    // no missile
    const r = consumeStockFor(s, [smallLaunch]);
    expect(r.validLaunches).toHaveLength(0);
    expect(r.state.leaders.chump.stockpile.warheadsSmall).toBe(1);
  });

  it('drops launches when attacker has no warhead', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 1;
    const r = consumeStockFor(s, [smallLaunch]);
    expect(r.validLaunches).toHaveLength(0);
    expect(r.state.leaders.chump.stockpile.missiles).toBe(1);
  });

  it('drops launches at dead targets', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.alive = false;
    const r = consumeStockFor(s, [smallLaunch]);
    expect(r.validLaunches).toHaveLength(0);
    expect(r.state.leaders.chump.stockpile.missiles).toBe(1); // not consumed
  });
});

describe('applyLaunches (assumes stock pre-consumed)', () => {
  it('intercepts when defenders fully cover incoming (always intercepted)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.shields = 5;
    const r = applyLaunches(s, [smallLaunch]);
    expect(r.state.leaders.carnage.population).toBe(25);
    expect(r.events.map((e) => e.kind)).toEqual(['MissileLaunched', 'MissileIntercepted']);
  });

  it('the 4th incoming with S=0 is guaranteed to land (overflow=4 → 0%) and applies 2M small-warhead deaths', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.carnage.population = 100;
    const r = applyLaunches(s, [smallLaunch, smallLaunch, smallLaunch, smallLaunch]);
    const impacts = r.events.filter((e) => e.kind === 'ImpactPeople');
    expect(impacts.length).toBeGreaterThanOrEqual(1);
    // every recorded impact uses the small-warhead damage profile
    for (const e of impacts) {
      if (e.kind === 'ImpactPeople') {
        expect(e.deaths).toBe(2);
        expect(e.warhead).toBe('small');
      }
    }
  });

  it('infrastructure targeting destroys factories instead of people (4 launches with S=0)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.carnage.factories = 10;
    const launch: Launch = {
      from: 'chump',
      to: 'carnage',
      delivery: 'missile',
      warhead: 'large',
      targetType: 'infra',
    };
    const r = applyLaunches(s, [launch, launch, launch, launch]);
    expect(r.events.some((e) => e.kind === 'ImpactInfrastructure')).toBe(true);
    expect(r.events.some((e) => e.kind === 'ImpactPeople')).toBe(false);
  });

  it('skips launches at dead receivers (no MissileLaunched event)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    const r = applyLaunches(s, [smallLaunch]);
    expect(r.events).toHaveLength(0);
  });

  it('advances rngState when an intercept roll is made', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const before = s.rngState;
    const r = applyLaunches(s, [smallLaunch]);
    expect(r.state.rngState).not.toBe(before);
  });

  it('does not require attacker to be alive (FR fires from a corpse)', () => {
    // Critical for Final Retaliation: applyLaunches MUST NOT gate on attacker.alive,
    // since FR's `from` leader is dead by definition.
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.alive = false;
    s.leaders.chump.population = 0;
    s.leaders.carnage.stockpile.shields = 5; // force intercept so deterministic
    const r = applyLaunches(s, [smallLaunch]);
    expect(r.events.map((e) => e.kind)).toEqual(['MissileLaunched', 'MissileIntercepted']);
  });
});
