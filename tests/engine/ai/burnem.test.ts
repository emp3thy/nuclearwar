import { describe, it, expect } from 'vitest';
import { planBurnem } from '../../../src/engine/ai/burnem';
import { initialState } from '../../../src/engine/state';

describe('Burn\'em (Handbrake Turn)', () => {
  it('placid + unprovoked: no launches, woos the leader with lowest favourability, may build', () => {
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'be1' });
    s.leaders.burnem.ap = 6;
    // No grudge entries against anyone.
    s.leaders.burnem.favourability = { carnage: 5, chump: 1 };

    const orders = planBurnem(s, 'burnem');

    expect(orders.filter((o) => o.kind === 'launch').length).toBe(0);
    const woo = orders.find((o) => o.kind === 'woo');
    expect(woo).toBeDefined();
    expect(woo?.kind === 'woo' && woo.target).toBe('chump');
  });

  it('provoked by impact: launches exist and every launch targets the provoker', () => {
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'be2' });
    s.leaders.burnem.ap = 10;
    s.leaders.burnem.grudge = { chump: 2 };
    s.leaders.burnem.stockpile.missiles = 3;
    s.leaders.burnem.stockpile.warheadsSmall = 3;

    const orders = planBurnem(s, 'burnem');
    const launches = orders.filter((o) => o.kind === 'launch');

    expect(launches.length).toBeGreaterThanOrEqual(1);
    for (const l of launches) {
      expect(l.kind === 'launch' && l.target).toBe('chump');
    }
  });

  it('provocation is permanent and redirects to the top surviving threat when the provoker is dead', () => {
    const s = initialState(
      { cast: ['burnem', 'carnage', 'chump', 'netanyahoo'], difficulty: 'normal', seed: 'be3' },
    );
    s.leaders.burnem.ap = 10;
    s.leaders.burnem.grudge = { chump: 2 };
    s.leaders.chump.alive = false;
    // netanyahoo has the bigger arsenal -> highest threatScore among survivors.
    s.leaders.netanyahoo.stockpile.warheadsLarge = 5;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    s.leaders.burnem.stockpile.missiles = 3;
    s.leaders.burnem.stockpile.warheadsSmall = 3;

    const orders = planBurnem(s, 'burnem');
    const launches = orders.filter((o) => o.kind === 'launch');

    expect(launches.length).toBeGreaterThanOrEqual(1);
    for (const l of launches) {
      expect(l.kind === 'launch' && l.target).toBe('netanyahoo');
    }
  });

  it('patience fallback at round 3 targets the highest-threat rival even unprovoked', () => {
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'be4' });
    s.round = 3;
    s.leaders.burnem.ap = 10;
    // No grudge entries.
    s.leaders.carnage.stockpile.warheadsLarge = 5;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.burnem.stockpile.missiles = 3;
    s.leaders.burnem.stockpile.warheadsSmall = 3;

    const orders = planBurnem(s, 'burnem');
    const launches = orders.filter((o) => o.kind === 'launch');

    expect(launches.length).toBeGreaterThanOrEqual(1);
    for (const l of launches) {
      expect(l.kind === 'launch' && l.target).toBe('carnage');
    }
  });

  it('stays placid at round 2 with 3+ leaders alive and no grudges', () => {
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'be4b' });
    s.round = 2;
    s.leaders.burnem.ap = 10;
    // No grudge entries.
    s.leaders.carnage.stockpile.warheadsLarge = 5;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.burnem.stockpile.missiles = 3;
    s.leaders.burnem.stockpile.warheadsSmall = 3;

    const orders = planBurnem(s, 'burnem');

    expect(orders.filter((o) => o.kind === 'launch').length).toBe(0);
  });

  it('patience fallback with only 2 survivors fires at any round with 2 survivors', () => {
    const s = initialState({ cast: ['burnem', 'chump'], difficulty: 'normal', seed: 'be5' });
    s.round = 2;
    s.leaders.burnem.ap = 10;
    // No grudge entries.
    s.leaders.burnem.stockpile.missiles = 3;
    s.leaders.burnem.stockpile.warheadsSmall = 3;

    const orders = planBurnem(s, 'burnem');
    expect(orders.some((o) => o.kind === 'launch')).toBe(true);
  });

  it('emits builds before launches in a provoked round with both present', () => {
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'be6' });
    s.leaders.burnem.ap = 20;
    s.leaders.burnem.grudge = { chump: 2 };
    // Below the provoked build plan's targets, so buildToward still has room
    // to queue more, while pre-existing stock lets launchSalvo fire too.
    s.leaders.burnem.stockpile.missiles = 1;
    s.leaders.burnem.stockpile.warheadsSmall = 2;

    const orders = planBurnem(s, 'burnem');
    const firstLaunch = orders.findIndex((o) => o.kind === 'launch');
    let lastBuild = -1;
    orders.forEach((o, i) => {
      if (o.kind.startsWith('build-')) lastBuild = i;
    });

    expect(firstLaunch).toBeGreaterThan(-1);
    expect(lastBuild).toBeGreaterThan(-1);
    expect(lastBuild).toBeLessThan(firstLaunch);
  });
});
