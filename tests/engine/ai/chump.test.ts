import { describe, it, expect } from 'vitest';
import { planChump } from '../../../src/engine/ai/chump';
import { initialState } from '../../../src/engine/state';

describe('Chump (Coward)', () => {
  it('biases toward defence + warhead builds when nothing exciting', () => {
    // Chump starts with no missiles/warheads, so no launch is possible.
    // All AP should go toward build orders (defence or warhead).
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c1' });
    const orders = planChump(s, 'chump');
    const builds = orders.filter((o) => o.kind.startsWith('build-'));
    expect(builds.length).toBeGreaterThan(0);
    // At least one defence or warhead build expected.
    expect(orders.some((o) => o.kind === 'build-defence' || o.kind === 'build-warhead')).toBe(true);
  });

  it('refuses to launch at a leader who has wooed him', () => {
    // carnage has wooed chump (favourability carnage: 5), so chump should not launch at carnage.
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c2' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.favourability = { carnage: 5 }; // carnage wooed chump
    s.leaders.carnage.population = 5; // weak target
    s.leaders.carnage.stockpile.shields = 0; // low defence
    const orders = planChump(s, 'chump');
    expect(orders.find((o) => o.kind === 'launch')).toBeUndefined();
  });

  it('launches at weak targets when not wooed', () => {
    // carnage is undefended + weak population, chump has missiles + warheads → should launch.
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c3' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.stockpile.shields = 0;
    const orders = planChump(s, 'chump');
    expect(orders.some((o) => o.kind === 'launch')).toBe(true);
  });

  it('prefers Infra targeting when launching', () => {
    // carnage has factories > 2, so launch should target infra not people.
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c4' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.factories = 5; // factories present, prefer infra
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.carnage.population = 100;
    const orders = planChump(s, 'chump');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeDefined();
    if (launch?.kind === 'launch') {
      expect(launch.targetType).toBe('infra');
    }
  });

  it('emits at least one propaganda order when AP allows', () => {
    // Chump starts with 5 AP and no missiles; builds will consume some AP but
    // at least 1 AP must remain for propaganda.
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c5' });
    const orders = planChump(s, 'chump');
    expect(orders.some((o) => o.kind === 'propaganda')).toBe(true);
  });
});
