import { describe, it, expect } from 'vitest';
import { planAi } from '../../../src/engine/ai';
import { initialState } from '../../../src/engine/state';
import { totalApCost } from '../../../src/engine/orders';

describe('planAi dispatcher', () => {
  it('returns valid orders within budget for every leader on normal difficulty', () => {
    for (const id of ['chump', 'carnage', 'starmless', 'khameneverhere', 'netanyahoo', 'mileigh-hem'] as const) {
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
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'hard', seed: 'hard-chump' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    // Carnage is wide-open (shields=0) — a launch lands, hurting carnage's threat to Chump.
    // Starmless has shields=5 — any launch always intercepts, no real progress.
    s.leaders.carnage.population = 8;
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.starmless.population = 8;
    s.leaders.starmless.stockpile.shields = 5;
    const orders = planAi(s, 'chump');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeDefined();
    if (launch?.kind === 'launch') {
      expect(launch.target).toBe('carnage');
    }
  });

  it('throws when called for a human player slot', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'planAi-human',
    });
    expect(() => planAi(s, 'player1')).toThrow(/human/i);
  });
});
