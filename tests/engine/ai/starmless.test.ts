import { describe, it, expect } from 'vitest';
import { planStarmless } from '../../../src/engine/ai/starmless';
import { initialState } from '../../../src/engine/state';
import { seedFromString, nextRandom } from '../../../src/engine/rng';

describe('Starmless (Cautious + Scapegoat)', () => {
  it('builds a factory in non-retaliation rounds (factory bias)', () => {
    // No recentAggressionFrom, no grudge → not a retaliation round.
    const s = initialState({ cast: ['starmless', 'carnage', 'chump'], difficulty: 'normal', seed: 'sm1' });
    // Give enough AP to afford a factory (cost=3).
    s.leaders.starmless.ap = 5;

    const orders = planStarmless(s, 'starmless');
    const factoryBuilt = orders.some((o) => o.kind === 'build-factory');
    expect(factoryBuilt).toBe(true);
  });

  it('targets the primary attacker on retaliation when scapegoat roll fails', () => {
    // Seed 'st-1' → nextRandom value ≈ 0.6246 (≥ 0.35, no scapegoat).
    const s = initialState({ cast: ['starmless', 'carnage', 'chump'], difficulty: 'normal', seed: 'st-1' });
    s.leaders.starmless.ap = 5;
    s.leaders.starmless.stockpile.missiles = 1;
    s.leaders.starmless.stockpile.warheadsSmall = 5;
    // Mark carnage as attacker with high aggression.
    s.leaders.starmless.recentAggressionFrom['carnage'] = 3;
    // Verify seed produces a non-scapegoat roll.
    expect(nextRandom(seedFromString('st-1')).value).toBeGreaterThanOrEqual(0.35);

    const orders = planStarmless(s, 'starmless');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('carnage');
  });

  it('scapegoats: targets leader with highest aggregate threat (not the actual attacker)', () => {
    // Seed 'st-0' → nextRandom value ≈ 0.0465 (< 0.35 → scapegoat).
    const s = initialState({ cast: ['starmless', 'carnage', 'chump'], difficulty: 'normal', seed: 'st-0' });
    s.leaders.starmless.ap = 5;
    s.leaders.starmless.stockpile.missiles = 1;
    s.leaders.starmless.stockpile.warheadsSmall = 5;
    // carnage is the attacker.
    s.leaders.starmless.recentAggressionFrom['carnage'] = 2;
    // Make chump a high-threat target (big arsenal) so they win aggregate threat.
    s.leaders.chump.stockpile.warheadsLarge = 10;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    // Verify seed produces a scapegoat roll.
    expect(nextRandom(seedFromString('st-0')).value).toBeLessThan(0.35);

    const orders = planStarmless(s, 'starmless');
    const launch = orders.find((o) => o.kind === 'launch');
    // Should target chump (highest aggregate threat), NOT carnage (the actual attacker).
    expect(launch?.target).toBe('chump');
    expect(launch?.target).not.toBe('carnage');
  });

  it('emits propaganda only at attackers, not at non-attackers', () => {
    // carnage attacked; chump did not.
    const s = initialState({ cast: ['starmless', 'carnage', 'chump'], difficulty: 'normal', seed: 'sm4' });
    s.leaders.starmless.ap = 6;
    s.leaders.starmless.recentAggressionFrom['carnage'] = 1;

    const orders = planStarmless(s, 'starmless');
    const props = orders.filter((o) => o.kind === 'propaganda');

    expect(props.some((o) => o.kind === 'propaganda' && o.target === 'carnage')).toBe(true);
    expect(props.some((o) => o.kind === 'propaganda' && o.target === 'chump')).toBe(false);
  });

  it('emits no propaganda when no leader has attacked Starmless', () => {
    const s = initialState({ cast: ['starmless', 'carnage', 'chump'], difficulty: 'normal', seed: 'sm5' });
    s.leaders.starmless.ap = 6;
    // No recentAggressionFrom, no grudge.

    const orders = planStarmless(s, 'starmless');
    const props = orders.filter((o) => o.kind === 'propaganda');
    expect(props).toHaveLength(0);
  });
});
