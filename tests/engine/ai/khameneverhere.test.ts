import { describe, it, expect } from 'vitest';
import { planKhameneverhere } from '../../../src/engine/ai/khameneverhere';
import { initialState } from '../../../src/engine/state';

describe('Khameneverhere (Grudge)', () => {
  it('targets the top of the grudge list when launching', () => {
    // Khameneverhere has grudge: carnage 9 > chump 2 — should launch at carnage.
    const s = initialState({ cast: ['khameneverhere', 'chump', 'carnage'], difficulty: 'normal', seed: 'k1' });
    s.leaders.khameneverhere.stockpile.missiles = 1;
    s.leaders.khameneverhere.stockpile.warheadsSmall = 1;
    s.leaders.khameneverhere.grudge = { chump: 2, carnage: 9 };
    const orders = planKhameneverhere(s, 'khameneverhere');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('carnage');
  });

  it('fallback: if grudge empty, picks any living non-self leader', () => {
    // No grudge → fallback to first living non-self leader; should still launch if stocked.
    const s = initialState({ cast: ['khameneverhere', 'chump', 'carnage'], difficulty: 'normal', seed: 'k2' });
    s.leaders.khameneverhere.stockpile.missiles = 1;
    s.leaders.khameneverhere.stockpile.warheadsSmall = 1;
    const orders = planKhameneverhere(s, 'khameneverhere');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBeDefined();
    expect(launch?.target).not.toBe('khameneverhere');
  });

  it('builds when no stockpile yet', () => {
    // Starts with 0 missiles and 0 warheads; all AP should go to builds.
    const s = initialState({ cast: ['khameneverhere', 'chump'], difficulty: 'normal', seed: 'k3' });
    const orders = planKhameneverhere(s, 'khameneverhere');
    expect(orders.some((o) => o.kind.startsWith('build-'))).toBe(true);
  });
});

describe('Khameneverhere aggression (P4c.2)', () => {
  it('fires a multi-launch salvo at the top grudge target when armed', () => {
    const s = initialState({ cast: ['khameneverhere', 'carnage', 'chump'], difficulty: 'normal', seed: 'ka1' });
    s.leaders.khameneverhere.stockpile.missiles = 3;
    s.leaders.khameneverhere.stockpile.warheadsSmall = 3;
    s.leaders.khameneverhere.ap = 12;
    s.leaders.khameneverhere.grudge = { carnage: 9 };
    const orders = planKhameneverhere(s, 'khameneverhere');
    const launches = orders.filter((o) => o.kind === 'launch');
    expect(launches.length).toBeGreaterThanOrEqual(2);
    expect(launches.every((o) => o.kind === 'launch' && o.target === 'carnage')).toBe(true);
  });

  it('builds large warheads (grudge goes large) with medium as fallback', () => {
    const s = initialState({ cast: ['khameneverhere', 'carnage'], difficulty: 'normal', seed: 'ka2' });
    s.leaders.khameneverhere.stockpile.missiles = 6;
    s.leaders.khameneverhere.stockpile.warheadsSmall = 4;
    s.leaders.khameneverhere.ap = 24;
    const orders = planKhameneverhere(s, 'khameneverhere');
    expect(orders.some((o) => o.kind === 'build-warhead' && o.yield === 'large')).toBe(true);
    expect(orders.some((o) => o.kind === 'build-warhead' && o.yield === 'medium')).toBe(true);
  });
});
