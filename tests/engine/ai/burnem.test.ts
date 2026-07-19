import { describe, it, expect } from 'vitest';
import { planBurnem } from '../../../src/engine/ai/burnem';
import { initialState } from '../../../src/engine/state';
import { seedFromString, nextRandom } from '../../../src/engine/rng';

describe('Burn\'em (Cautious + Scapegoat)', () => {
  it('builds a factory in non-retaliation rounds (factory bias)', () => {
    // No recentAggressionFrom, no grudge → not a retaliation round.
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'sm1' });
    // Give enough AP to afford a factory (cost=3).
    s.leaders.burnem.ap = 5;

    const orders = planBurnem(s, 'burnem');
    const factoryBuilt = orders.some((o) => o.kind === 'build-factory');
    expect(factoryBuilt).toBe(true);
  });

  it('targets the primary attacker on retaliation when scapegoat roll fails', () => {
    // Seed 'st-1' → nextRandom value ≈ 0.6246 (≥ 0.35, no scapegoat).
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'st-1' });
    s.leaders.burnem.ap = 5;
    s.leaders.burnem.stockpile.missiles = 1;
    s.leaders.burnem.stockpile.warheadsSmall = 5;
    // Mark carnage as attacker with high aggression.
    s.leaders.burnem.recentAggressionFrom['carnage'] = 3;
    // Verify seed produces a non-scapegoat roll.
    expect(nextRandom(seedFromString('st-1')).value).toBeGreaterThanOrEqual(0.35);

    const orders = planBurnem(s, 'burnem');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('carnage');
  });

  it('scapegoats: targets leader with highest aggregate threat (not the actual attacker)', () => {
    // Seed 'st-0' → nextRandom value ≈ 0.0465 (< 0.35 → scapegoat).
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'st-0' });
    s.leaders.burnem.ap = 5;
    s.leaders.burnem.stockpile.missiles = 1;
    s.leaders.burnem.stockpile.warheadsSmall = 5;
    // carnage is the attacker.
    s.leaders.burnem.recentAggressionFrom['carnage'] = 2;
    // Make chump a high-threat target (big arsenal) so they win aggregate threat.
    s.leaders.chump.stockpile.warheadsLarge = 10;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    // Verify seed produces a scapegoat roll.
    expect(nextRandom(seedFromString('st-0')).value).toBeLessThan(0.35);

    const orders = planBurnem(s, 'burnem');
    const launch = orders.find((o) => o.kind === 'launch');
    // Should target chump (highest aggregate threat), NOT carnage (the actual attacker).
    expect(launch?.target).toBe('chump');
    expect(launch?.target).not.toBe('carnage');
  });

  it('emits propaganda only at attackers, not at non-attackers', () => {
    // carnage attacked; chump did not.
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'sm4' });
    s.leaders.burnem.ap = 6;
    s.leaders.burnem.recentAggressionFrom['carnage'] = 1;

    const orders = planBurnem(s, 'burnem');
    const props = orders.filter((o) => o.kind === 'propaganda');

    expect(props.some((o) => o.kind === 'propaganda' && o.target === 'carnage')).toBe(true);
    expect(props.some((o) => o.kind === 'propaganda' && o.target === 'chump')).toBe(false);
  });

  it('emits no propaganda when no leader has attacked Burn\'em', () => {
    const s = initialState({ cast: ['burnem', 'carnage', 'chump'], difficulty: 'normal', seed: 'sm5' });
    s.leaders.burnem.ap = 6;
    // No recentAggressionFrom, no grudge.

    const orders = planBurnem(s, 'burnem');
    const props = orders.filter((o) => o.kind === 'propaganda');
    expect(props).toHaveLength(0);
  });
});

describe('Burn\'em kill instinct (P4c.2)', () => {
  it('launches at a finishable low-population opponent with no prior attack', () => {
    const s = initialState({ cast: ['burnem', 'carnage'], difficulty: 'normal', seed: 'sa1' });
    s.leaders.burnem.stockpile.missiles = 2;
    s.leaders.burnem.stockpile.warheadsSmall = 2;
    s.leaders.burnem.ap = 10;
    s.leaders.carnage.population = 4; // finishable — below the finish threshold
    // No grudge / aggression from carnage → not a retaliation round.
    const orders = planBurnem(s, 'burnem');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeDefined();
    expect(launch?.kind === 'launch' && launch.target).toBe('carnage');
  });

  it('does not launch when no opponent is finishable and no retaliation is pending', () => {
    const s = initialState({ cast: ['burnem', 'carnage'], difficulty: 'normal', seed: 'sa2' });
    s.leaders.burnem.stockpile.missiles = 2;
    s.leaders.burnem.stockpile.warheadsSmall = 2;
    s.leaders.burnem.ap = 10;
    s.leaders.carnage.population = 25; // healthy — not finishable
    const orders = planBurnem(s, 'burnem');
    expect(orders.some((o) => o.kind === 'launch')).toBe(false);
  });
});
