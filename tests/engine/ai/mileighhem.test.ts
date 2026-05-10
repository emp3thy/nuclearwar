import { describe, it, expect } from 'vitest';
import { planMileighHem } from '../../../src/engine/ai/mileighhem';
import { initialState } from '../../../src/engine/state';

describe('Mileigh-hem (Glass cannon)', () => {
  it('activates all-out mode when apBanked + ap >= 4 and emits launch orders', () => {
    const s = initialState({
      cast: ['mileigh-hem', 'carnage', 'chump'],
      difficulty: 'normal',
      seed: 'mh-allout-1',
    });
    // Set up stockpile and AP to trigger all-out mode.
    s.leaders['mileigh-hem'].ap = 4;
    s.leaders['mileigh-hem'].apBanked = 0;
    s.leaders['mileigh-hem'].stockpile.missiles = 2;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 3;
    // Mark carnage as an attacker.
    s.leaders['mileigh-hem'].grudge['carnage'] = 2;

    const orders = planMileighHem(s, 'mileigh-hem');
    const launches = orders.filter((o) => o.kind === 'launch');

    // Should emit at least 1 launch in all-out mode.
    expect(launches.length).toBeGreaterThanOrEqual(1);
  });

  it('stays in diplomatic mode when apBanked + ap < 4, emitting woo/propaganda instead of launches', () => {
    const s = initialState({
      cast: ['mileigh-hem', 'carnage', 'chump'],
      difficulty: 'normal',
      seed: 'mh-diplo-1',
    });
    // Total AP = 1+1 = 2 < 4 → diplomatic mode.
    s.leaders['mileigh-hem'].ap = 2;
    s.leaders['mileigh-hem'].apBanked = 1;
    s.leaders['mileigh-hem'].stockpile.missiles = 1;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 5;
    // Mark carnage as an attacker so diplomatic orders have targets.
    s.leaders['mileigh-hem'].grudge['carnage'] = 1;

    const orders = planMileighHem(s, 'mileigh-hem');
    const launches = orders.filter((o) => o.kind === 'launch');
    const woos = orders.filter((o) => o.kind === 'woo');
    const props = orders.filter((o) => o.kind === 'propaganda');

    // No launches in diplomatic mode.
    expect(launches).toHaveLength(0);
    // Should have woo or propaganda orders.
    expect(woos.length + props.length).toBeGreaterThan(0);
  });

  it('never emits build-defence orders in either mode', () => {
    // Diplomatic mode: no defence.
    const sd = initialState({
      cast: ['mileigh-hem', 'carnage', 'chump'],
      difficulty: 'normal',
      seed: 'mh-nodef-d',
    });
    sd.leaders['mileigh-hem'].ap = 2;
    sd.leaders['mileigh-hem'].apBanked = 0;
    sd.leaders['mileigh-hem'].stockpile.missiles = 1;
    sd.leaders['mileigh-hem'].stockpile.warheadsSmall = 3;

    const diploOrders = planMileighHem(sd, 'mileigh-hem');
    expect(diploOrders.every((o) => o.kind !== 'build-defence')).toBe(true);

    // All-out mode: no defence either.
    const sa = initialState({
      cast: ['mileigh-hem', 'carnage', 'chump'],
      difficulty: 'normal',
      seed: 'mh-nodef-a',
    });
    sa.leaders['mileigh-hem'].ap = 4;
    sa.leaders['mileigh-hem'].apBanked = 2;
    sa.leaders['mileigh-hem'].stockpile.missiles = 2;
    sa.leaders['mileigh-hem'].stockpile.warheadsSmall = 3;
    sa.leaders['mileigh-hem'].grudge['carnage'] = 1;

    const allOutOrders = planMileighHem(sa, 'mileigh-hem');
    expect(allOutOrders.every((o) => o.kind !== 'build-defence')).toBe(true);
  });

  it('in all-out mode only launches at leaders who attacked (wasAttackedBy)', () => {
    const s = initialState({
      cast: ['mileigh-hem', 'carnage', 'chump'],
      difficulty: 'normal',
      seed: 'mh-target-1',
    });
    s.leaders['mileigh-hem'].ap = 4;
    s.leaders['mileigh-hem'].apBanked = 0;
    s.leaders['mileigh-hem'].stockpile.missiles = 3;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 3;
    // Only carnage attacked, chump did not.
    s.leaders['mileigh-hem'].grudge['carnage'] = 3;
    // Chump has no grudge/aggression entry.

    const orders = planMileighHem(s, 'mileigh-hem');
    const launches = orders.filter((o) => o.kind === 'launch');

    expect(launches.length).toBeGreaterThan(0);
    // All launches should target only carnage (the attacker), not chump.
    for (const l of launches) {
      if (l.kind === 'launch') {
        expect(l.target).toBe('carnage');
        expect(l.target).not.toBe('chump');
      }
    }
  });

  it('uses largest warheads first in all-out mode (greedy yield order)', () => {
    const s = initialState({
      cast: ['mileigh-hem', 'carnage', 'chump'],
      difficulty: 'normal',
      seed: 'mh-yield-1',
    });
    s.leaders['mileigh-hem'].ap = 6;
    s.leaders['mileigh-hem'].apBanked = 0;
    s.leaders['mileigh-hem'].stockpile.missiles = 3;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 1;
    s.leaders['mileigh-hem'].stockpile.warheadsMedium = 1;
    s.leaders['mileigh-hem'].stockpile.warheadsLarge = 1;
    s.leaders['mileigh-hem'].grudge['carnage'] = 1;

    const orders = planMileighHem(s, 'mileigh-hem');
    const launches = orders.filter((o) => o.kind === 'launch');

    // Expect at least 3 launches, first should use 'large', then 'medium', then 'small'.
    expect(launches.length).toBe(3);
    if (launches[0].kind === 'launch') expect(launches[0].warhead).toBe('large');
    if (launches[1].kind === 'launch') expect(launches[1].warhead).toBe('medium');
    if (launches[2].kind === 'launch') expect(launches[2].warhead).toBe('small');
  });

  it('in diplomatic mode with no attackers, still emits woo orders at other leaders', () => {
    const s = initialState({
      cast: ['mileigh-hem', 'carnage', 'chump'],
      difficulty: 'normal',
      seed: 'mh-diplo-noattack',
    });
    // Below threshold, no attackers.
    s.leaders['mileigh-hem'].ap = 3;
    s.leaders['mileigh-hem'].apBanked = 0;

    const orders = planMileighHem(s, 'mileigh-hem');
    const woos = orders.filter((o) => o.kind === 'woo');

    // No attackers, so woo pool falls back to all others → expect woo orders.
    expect(woos.length).toBeGreaterThanOrEqual(1);
  });

  it('all-out mode with apBanked contributing to the threshold', () => {
    const s = initialState({
      cast: ['mileigh-hem', 'carnage'],
      difficulty: 'normal',
      seed: 'mh-banked',
    });
    // ap=2, apBanked=2: 2+2=4 >= 4 → activates.
    s.leaders['mileigh-hem'].ap = 2;
    s.leaders['mileigh-hem'].apBanked = 2;
    s.leaders['mileigh-hem'].stockpile.missiles = 1;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 1;
    s.leaders['mileigh-hem'].grudge['carnage'] = 1;

    const orders = planMileighHem(s, 'mileigh-hem');
    const launches = orders.filter((o) => o.kind === 'launch');
    expect(launches.length).toBeGreaterThanOrEqual(1);
  });
});
