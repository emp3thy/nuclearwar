import { describe, it, expect } from 'vitest';
import { nextRandom, nextInt, seedFromString, mix32 } from '../../src/engine/rng';

describe('nextRandom', () => {
  it('produces deterministic sequence from a fixed seed', () => {
    let s = 1;
    const seq: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = nextRandom(s);
      seq.push(r.value);
      s = r.state;
    }
    let s2 = 1;
    const seq2: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = nextRandom(s2);
      seq2.push(r.value);
      s2 = r.state;
    }
    expect(seq).toEqual(seq2);
  });

  it('produces different sequences from different seeds', () => {
    expect(nextRandom(1).value).not.toBe(nextRandom(2).value);
  });

  it('returns values in [0, 1)', () => {
    let s = 42;
    for (let i = 0; i < 200; i++) {
      const r = nextRandom(s);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      s = r.state;
    }
  });
});

describe('nextInt', () => {
  it('returns integers in [0, max)', () => {
    let s = 7;
    for (let i = 0; i < 200; i++) {
      const r = nextInt(s, 5);
      expect(Number.isInteger(r.value)).toBe(true);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(5);
      s = r.state;
    }
  });
});

describe('seedFromString', () => {
  it('is deterministic and order-sensitive', () => {
    expect(seedFromString('hello')).toBe(seedFromString('hello'));
    expect(seedFromString('hello')).not.toBe(seedFromString('world'));
    expect(seedFromString('abc')).not.toBe(seedFromString('cba'));
  });
});

describe('mix32', () => {
  it('is deterministic and order-sensitive', () => {
    expect(mix32(1, 2, 3)).toBe(mix32(1, 2, 3));
    expect(mix32(1, 2, 3)).not.toBe(mix32(3, 2, 1));
  });
});
