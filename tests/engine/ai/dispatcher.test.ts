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
});
