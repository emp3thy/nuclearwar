import { describe, it, expect } from 'vitest';
import { interceptProbability, peopleDeaths, factoriesDestroyed } from '../../src/engine/combat';

describe('interceptProbability', () => {
  it('returns 1.0 for the Nth incoming when N <= S', () => {
    expect(interceptProbability(1, 3)).toBe(1.0);
    expect(interceptProbability(3, 3)).toBe(1.0);
  });

  it('degrades on overflow (75 / 50 / 25 / 0)', () => {
    expect(interceptProbability(4, 3)).toBe(0.75);
    expect(interceptProbability(5, 3)).toBe(0.5);
    expect(interceptProbability(6, 3)).toBe(0.25);
    expect(interceptProbability(7, 3)).toBe(0);
    expect(interceptProbability(99, 3)).toBe(0);
  });

  it('handles zero defenders — no intercept chance (deployed pool empty)', () => {
    // With no deployed defenders, any incoming missile lands (0% intercept).
    expect(interceptProbability(1, 0)).toBe(0);
    expect(interceptProbability(2, 0)).toBe(0);
    expect(interceptProbability(4, 0)).toBe(0);
  });
});

describe('peopleDeaths', () => {
  it('returns spec damage and caps at current population', () => {
    expect(peopleDeaths('small', 100)).toBe(2);
    expect(peopleDeaths('medium', 100)).toBe(6);
    expect(peopleDeaths('large', 100)).toBe(15);
    expect(peopleDeaths('large', 5)).toBe(5);
    expect(peopleDeaths('small', 1)).toBe(1);
    expect(peopleDeaths('small', 0)).toBe(0);
  });
});

describe('factoriesDestroyed', () => {
  it('returns spec damage and caps at current factories', () => {
    expect(factoriesDestroyed('small', 5)).toBe(1);
    expect(factoriesDestroyed('medium', 5)).toBe(2);
    expect(factoriesDestroyed('large', 5)).toBe(3);
    expect(factoriesDestroyed('large', 1)).toBe(1);
    expect(factoriesDestroyed('large', 0)).toBe(0);
  });
});
