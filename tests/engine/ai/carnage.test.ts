import { describe, it, expect } from 'vitest';
import { planCarnage } from '../../../src/engine/ai/carnage';
import { initialState } from '../../../src/engine/state';

describe('Carnage (Rational + Opportunist)', () => {
  it('launches at the highest-threat target', () => {
    const s = initialState({ cast: ['carnage', 'chump', 'netanyahoo'], difficulty: 'normal', seed: 'c1' });
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    // Give netanyahoo a much larger arsenal so they score higher.
    s.leaders.netanyahoo.stockpile.warheadsLarge = 10;
    s.leaders.chump.stockpile.warheadsSmall = 1;

    const orders = planCarnage(s, 'carnage');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('netanyahoo');
  });

  it('prefers an attacker over a similar non-attacker due to escalation multiplier', () => {
    const s = initialState({ cast: ['carnage', 'chump', 'netanyahoo'], difficulty: 'normal', seed: 'c2' });
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    // Give both targets equal arsenals.
    s.leaders.chump.stockpile.warheadsSmall = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 3;
    // Mark netanyahoo as having attacked Carnage last round.
    s.leaders.carnage.recentAggressionFrom['netanyahoo'] = 1;

    const orders = planCarnage(s, 'carnage');
    const launch = orders.find((o) => o.kind === 'launch');
    // Netanyahoo's threat is doubled by escalation → preferred over chump.
    expect(launch?.target).toBe('netanyahoo');
  });

  it('opportunism bonus pushes a weak leader above a stronger one', () => {
    const s = initialState({ cast: ['carnage', 'chump', 'starmless'], difficulty: 'normal', seed: 'c3' });
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    // Chump: moderate arsenal, healthy population.
    s.leaders.chump.stockpile.warheadsSmall = 4;
    s.leaders.chump.population = 20;
    s.leaders.chump.factories = 5;
    // Starmless: slightly weaker arsenal but critically low population → big opportunism bonus.
    s.leaders.starmless.stockpile.warheadsSmall = 2;
    s.leaders.starmless.population = 3;  // triggers perPopBelow10M bonus: (10-3)*4 = 28
    s.leaders.starmless.factories = 1;   // triggers perFactoryBelow3 bonus: (3-1)*2 = 4

    const orders = planCarnage(s, 'carnage');
    const launch = orders.find((o) => o.kind === 'launch');
    // Starmless: threat=2, opportunism=28+4=32, total=34
    // Chump: threat=4, opportunism=0, total=4
    expect(launch?.target).toBe('starmless');
  });

  it('emits propaganda only at leaders who attacked Carnage, not others', () => {
    const s = initialState({ cast: ['carnage', 'chump', 'netanyahoo'], difficulty: 'normal', seed: 'c4' });
    // Give enough AP for propaganda.
    s.leaders.carnage.ap = 5;
    // Mark only chump as an attacker.
    s.leaders.carnage.recentAggressionFrom['chump'] = 1;
    // Netanyahoo has not attacked.

    const orders = planCarnage(s, 'carnage');
    const props = orders.filter((o) => o.kind === 'propaganda');

    // Should propagandise chump (the attacker).
    expect(props.some((o) => o.kind === 'propaganda' && o.target === 'chump')).toBe(true);
    // Should NOT propagandise netanyahoo (not an attacker).
    expect(props.some((o) => o.kind === 'propaganda' && o.target === 'netanyahoo')).toBe(false);
  });

  it('emits no propaganda when no leader has attacked Carnage', () => {
    const s = initialState({ cast: ['carnage', 'chump', 'netanyahoo'], difficulty: 'normal', seed: 'c5' });
    s.leaders.carnage.ap = 6;
    // No recentAggressionFrom, no grudge → no attackers.

    const orders = planCarnage(s, 'carnage');
    const props = orders.filter((o) => o.kind === 'propaganda');
    expect(props).toHaveLength(0);
  });
});
