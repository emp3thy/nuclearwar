import { describe, expect, it } from 'vitest';
import { MASTHEAD_POOL, shuffleMastheads, pickMasthead } from '../../src/engine/masthead';
import { seedFromString } from '../../src/engine/rng';

describe('masthead', () => {
  it('pool has 15 unique entries', () => {
    expect(MASTHEAD_POOL).toHaveLength(15);
    expect(new Set(MASTHEAD_POOL).size).toBe(15);
  });

  it('shuffleMastheads returns all 15 names exactly once', () => {
    const r = shuffleMastheads(seedFromString('any'));
    expect(r.order).toHaveLength(15);
    expect(new Set(r.order).size).toBe(15);
    for (const name of MASTHEAD_POOL) expect(r.order).toContain(name);
  });

  it('same seed = same shuffle order', () => {
    const a = shuffleMastheads(seedFromString('repeat'));
    const b = shuffleMastheads(seedFromString('repeat'));
    expect(a.order).toEqual(b.order);
  });

  it('different seeds usually produce different orders', () => {
    const a = shuffleMastheads(seedFromString('seed-a'));
    const b = shuffleMastheads(seedFromString('seed-b'));
    expect(a.order).not.toEqual(b.order);
  });

  it('threads rngState forward', () => {
    const before = seedFromString('thread');
    const r = shuffleMastheads(before);
    expect(r.rngState).not.toBe(before);
  });

  it('pickMasthead returns apocalypse override when outcome.type === "apocalypse"', () => {
    const order = [...MASTHEAD_POOL];
    expect(pickMasthead(order, 0, { type: 'apocalypse' })).toBe('THE END TIMES — FINAL EDITION');
    expect(pickMasthead(order, 5, { type: 'apocalypse' })).toBe('THE END TIMES — FINAL EDITION');
  });

  it('pickMasthead returns order[(round-1) % 15] otherwise', () => {
    const order = [...MASTHEAD_POOL];
    expect(pickMasthead(order, 1, null)).toBe(order[0]);
    expect(pickMasthead(order, 16, null)).toBe(order[0]);
    expect(pickMasthead(order, 17, null)).toBe(order[1]);
  });
});
