import { describe, it, expect } from 'vitest';
import { planNetanyahoo } from '../../../src/engine/ai/netanyahoo';
import { initialState } from '../../../src/engine/state';

describe('Netanyahoo (Warmonger)', () => {
  it('does not launch at Chump until Chump has attacked first', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'n1' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    // No grudge / aggression from chump → Chump-exception fires.
    const orders = planNetanyahoo(s, 'netanyahoo');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeUndefined();
  });

  it('launches at Chump once Chump has attacked', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'n2' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s.leaders.netanyahoo.grudge = { chump: 5 };
    const orders = planNetanyahoo(s, 'netanyahoo');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('chump');
  });

  it('propagandises Chump even when not launching', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'n3' });
    const orders = planNetanyahoo(s, 'netanyahoo');
    expect(orders.some((o) => o.kind === 'propaganda' && o.target === 'chump')).toBe(true);
  });

  it('biases toward the largest-arsenal target', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'n4' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s.leaders.netanyahoo.grudge = { chump: 1 }; // chump is allowed
    s.leaders.carnage.stockpile.warheadsLarge = 5; // largest arsenal
    s.leaders.starmless.stockpile.warheadsSmall = 1;
    const orders = planNetanyahoo(s, 'netanyahoo');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('carnage');
  });
});

describe('Netanyahoo missile bias regression (P4c.1)', () => {
  it('still emits build-missile and never build-bomber', () => {
    // No delivery owned → planner must build. Full AP budget ensures the build
    // path is reached. Uses the same initialState factory as the existing tests.
    const s = initialState({
      cast: ['netanyahoo', 'chump'],
      difficulty: 'normal',
      seed: 'netanyahoo-missile-bias',
    });
    s.leaders.netanyahoo.stockpile.missiles = 0;
    s.leaders.netanyahoo.stockpile.bombers = 0;
    s.leaders.netanyahoo.ap = 6;

    const orders = planNetanyahoo(s, 'netanyahoo');

    expect(orders.some((o) => o.kind === 'build-missile')).toBe(true);
    expect(orders.some((o) => o.kind === 'build-bomber')).toBe(false);
  });
});

describe('Netanyahoo aggression (P4c.2)', () => {
  it('actually fires when armed — the zero-fire bug is gone', () => {
    const s = initialState({ cast: ['netanyahoo', 'carnage'], difficulty: 'normal', seed: 'na1' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 3;
    s.leaders.netanyahoo.ap = 10;
    const orders = planNetanyahoo(s, 'netanyahoo');
    expect(orders.filter((o) => o.kind === 'launch').length).toBeGreaterThanOrEqual(1);
  });

  it('fires a multi-launch salvo when richly armed', () => {
    const s = initialState({ cast: ['netanyahoo', 'carnage'], difficulty: 'normal', seed: 'na2' });
    s.leaders.netanyahoo.stockpile.missiles = 4;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 4;
    s.leaders.netanyahoo.ap = 12;
    const orders = planNetanyahoo(s, 'netanyahoo');
    expect(orders.filter((o) => o.kind === 'launch').length).toBeGreaterThanOrEqual(2);
  });

  it('builds toward a yield ramp (medium/large warheads), not only small', () => {
    const s = initialState({ cast: ['netanyahoo', 'carnage'], difficulty: 'normal', seed: 'na3' });
    s.leaders.netanyahoo.stockpile.missiles = 6;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 4;
    s.leaders.netanyahoo.ap = 12;
    const orders = planNetanyahoo(s, 'netanyahoo');
    expect(orders.some((o) => o.kind === 'build-warhead' && o.yield === 'medium')).toBe(true);
  });

  it('emits builds before launches (validateOrderSequence ordering)', () => {
    const s = initialState({ cast: ['netanyahoo', 'carnage'], difficulty: 'normal', seed: 'na4' });
    s.leaders.netanyahoo.stockpile.missiles = 2;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 2;
    s.leaders.netanyahoo.ap = 12;
    const orders = planNetanyahoo(s, 'netanyahoo');
    const firstLaunch = orders.findIndex((o) => o.kind === 'launch');
    let lastBuild = -1;
    orders.forEach((o, i) => {
      if (o.kind.startsWith('build-')) lastBuild = i;
    });
    // Both must be present for this scenario, and every build must precede
    // the first launch — the reducer validates the order array in sequence.
    expect(firstLaunch).toBeGreaterThan(-1);
    expect(lastBuild).toBeGreaterThan(-1);
    expect(lastBuild).toBeLessThan(firstLaunch);
  });
});
