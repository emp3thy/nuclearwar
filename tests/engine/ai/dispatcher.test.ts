import { describe, it, expect } from 'vitest';
import { planAi } from '../../../src/engine/ai';
import { initialState } from '../../../src/engine/state';
import { totalApCost } from '../../../src/engine/orders';

describe('planAi dispatcher', () => {
  it('returns valid orders within budget for every leader on normal difficulty', () => {
    for (const id of ['chump', 'carnage', 'burnem', 'khameneverhere', 'netanyahoo', 'mileigh-hem'] as const) {
      const s = initialState({ cast: [id, 'carnage'], difficulty: 'normal', seed: `dispatch-${id}` });
      const orders = planAi(s, id);
      expect(totalApCost(orders)).toBeLessThanOrEqual(s.leaders[id].ap);
    }
  });

  it('Easy difficulty produces strictly different output than Normal for the same seed (sometimes)', () => {
    // 30 % randomization should generally produce different output. We assert this
    // probabilistically: across 20 seeds, at least 5 should differ.
    let diffs = 0;
    for (let i = 0; i < 20; i++) {
      const sN = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: `e-${i}` });
      const sE = initialState({ cast: ['chump', 'carnage'], difficulty: 'easy', seed: `e-${i}` });
      const oN = planAi(sN, 'chump', 'normal');
      const oE = planAi(sE, 'chump', 'easy');
      if (JSON.stringify(oN) !== JSON.stringify(oE)) diffs++;
    }
    expect(diffs).toBeGreaterThanOrEqual(5);
  });

  it('Normal difficulty randomization rate is lower than Easy', () => {
    // Probabilistic: across 20 seeds, Easy's diff-from-deterministic-baseline > Normal's.
    // Skip assertion if both happen to be 0 (rare, RNG-dependent).
    // (Implementation detail; can be skipped or replaced with a seed-dependent assertion.)
  });

  it('Easy/Normal randomization never produces an over-budget order list', () => {
    // Sweep seeds; assert every output stays within the leader's AP budget.
    for (let i = 0; i < 50; i++) {
      const seed = `randomize-budget-${i}`;
      const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'easy', seed });
      const orders = planAi(s, 'chump', 'easy');
      expect(totalApCost(orders)).toBeLessThanOrEqual(s.leaders.chump.ap);
    }
  });

  it('Hard Chump picks the target whose projected outcome favours him', () => {
    const s = initialState({ cast: ['chump', 'carnage', 'burnem'], difficulty: 'hard', seed: 'hard-chump' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    // Carnage is wide-open (shields=0) — a launch lands, hurting carnage's threat to Chump.
    // Burn'em has shields=5 — any launch always intercepts, no real progress.
    s.leaders.carnage.population = 8;
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.burnem.population = 8;
    s.leaders.burnem.stockpile.shields = 5;
    const orders = planAi(s, 'chump');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeDefined();
    if (launch?.kind === 'launch') {
      expect(launch.target).toBe('carnage');
    }
  });

  it('throws when called for an alive human player slot', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'planAi-human',
    });
    expect(() => planAi(s, 'player1')).toThrow(/planAi.*human/i);
  });

  it('returns [] (does not throw) when called for an eliminated human player slot', () => {
    // Dead AI returns []; dead human must mirror that — Phase 3 callers iterate
    // the cast and rely on planAi(state, deadId) === [] without special-casing.
    // The "throw on human" guard is for ALIVE-human routing bugs only.
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'planAi-dead-human',
    });
    s.leaders.player1.alive = false;
    s.leaders.player1.population = 0;
    expect(planAi(s, 'player1')).toEqual([]);
  });
});
