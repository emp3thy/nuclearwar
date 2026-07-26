import { describe, it, expect } from 'vitest';
import { DIFFICULTY_RANDOM_PCT, randomizationCandidates } from '../../../src/engine/ai/index';

describe('DIFFICULTY_RANDOM_PCT', () => {
  it('easy is lowered to light non-lethal noise; normal/hard unchanged', () => {
    expect(DIFFICULTY_RANDOM_PCT.easy).toBe(0.12);
    expect(DIFFICULTY_RANDOM_PCT.normal).toBe(0.1);
    expect(DIFFICULTY_RANDOM_PCT.hard).toBe(0);
  });
});

describe('randomizationCandidates', () => {
  it('easy excludes build-warhead medium/large, keeps the rest of the pool', () => {
    const candidates = randomizationCandidates('easy');
    expect(candidates.some((o) => o.kind === 'build-warhead' && o.yield === 'medium')).toBe(false);
    expect(candidates.some((o) => o.kind === 'build-warhead' && o.yield === 'large')).toBe(false);
    expect(candidates.some((o) => o.kind === 'build-warhead' && o.yield === 'small')).toBe(true);
    expect(candidates.some((o) => o.kind === 'build-factory')).toBe(true);
    expect(candidates.some((o) => o.kind === 'build-missile')).toBe(true);
    expect(candidates.some((o) => o.kind === 'build-bomber')).toBe(true);
    expect(candidates.some((o) => o.kind === 'build-defence' && o.type === 'shield')).toBe(true);
    expect(candidates.some((o) => o.kind === 'build-defence' && o.type === 'aa')).toBe(true);
    expect(candidates.length).toBe(6);
  });

  it('normal keeps the full 8-item pool, including medium/large warheads', () => {
    const candidates = randomizationCandidates('normal');
    expect(candidates.some((o) => o.kind === 'build-warhead' && o.yield === 'medium')).toBe(true);
    expect(candidates.some((o) => o.kind === 'build-warhead' && o.yield === 'large')).toBe(true);
    expect(candidates.length).toBe(8);
  });

  it('hard keeps the full 8-item pool too (unused since hard pct is 0, but not special-cased)', () => {
    const candidates = randomizationCandidates('hard');
    expect(candidates.length).toBe(8);
  });
});
