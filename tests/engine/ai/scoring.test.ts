import { describe, it, expect } from 'vitest';
import {
  threatScore,
  opportunismScore,
  defenceVisibilityScore,
  populationAdvantage,
  wasAttackedBy,
  topGrudgeTarget,
} from '../../../src/engine/ai/scoring';
import { initialState } from '../../../src/engine/state';

describe('threatScore', () => {
  it('rises with arsenal + recent aggression', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.missiles = 3;
    s.leaders.carnage.stockpile.warheadsLarge = 2;
    expect(threatScore(s, 'chump', 'carnage')).toBeGreaterThan(threatScore(s, 'chump', 'chump'));
  });

  it('weights large warheads more than small', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.warheadsLarge = 1;
    const aLarge = threatScore(s, 'chump', 'carnage');
    s.leaders.carnage.stockpile.warheadsLarge = 0;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    const aSmall = threatScore(s, 'chump', 'carnage');
    expect(aLarge).toBeGreaterThan(aSmall);
  });

  it('factors recent aggression', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const baseline = threatScore(s, 'chump', 'carnage');
    s.leaders.chump.recentAggressionFrom = { carnage: 2 };
    expect(threatScore(s, 'chump', 'carnage')).toBeGreaterThan(baseline);
  });
});

describe('opportunismScore', () => {
  it('rises as target population shrinks', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const full = opportunismScore(s, 'carnage');
    s.leaders.carnage.population = 5;
    expect(opportunismScore(s, 'carnage')).toBeGreaterThan(full);
  });

  it('falls when target has many defenders', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.population = 5;
    const undefended = opportunismScore(s, 'carnage');
    s.leaders.carnage.stockpile.shields = 5;
    s.leaders.carnage.stockpile.aa = 5;
    expect(opportunismScore(s, 'carnage')).toBeLessThan(undefended);
  });
});

describe('defenceVisibilityScore', () => {
  it('returns the sum of shields + aa', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.shields = 2;
    s.leaders.carnage.stockpile.aa = 1;
    expect(defenceVisibilityScore(s, 'carnage')).toBe(3);
  });
});

describe('populationAdvantage', () => {
  it('positive when self has more pop than target', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(populationAdvantage(s, 'chump', 'carnage')).toBe(33 - 25);
  });
});

describe('wasAttackedBy', () => {
  it('true when grudge or aggression entry > 0', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(wasAttackedBy(s, 'chump', 'carnage')).toBe(false);
    s.leaders.chump.grudge = { carnage: 1 };
    expect(wasAttackedBy(s, 'chump', 'carnage')).toBe(true);
  });
});

describe('topGrudgeTarget', () => {
  it('returns the leader with the highest grudge value', () => {
    const s = initialState({ cast: ['khameneverhere', 'chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.khameneverhere.grudge = { chump: 3, carnage: 7 };
    expect(topGrudgeTarget(s, 'khameneverhere')).toBe('carnage');
  });

  it('returns null if grudge is empty', () => {
    const s = initialState({ cast: ['khameneverhere', 'chump'], difficulty: 'normal', seed: 'x' });
    expect(topGrudgeTarget(s, 'khameneverhere')).toBeNull();
  });
});
