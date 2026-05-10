import { describe, it, expect } from 'vitest';
import { simulateOneRound, scoreState, bestTargetByLookahead } from '../../../src/engine/ai/lookahead';
import { dispatch } from '../../../src/engine/ai/dispatch';
import { planAi } from '../../../src/engine/ai';
import { initialState } from '../../../src/engine/state';
import type { Order } from '../../../src/engine/types';

describe('simulateOneRound', () => {
  it('runs one round forward without mutating the input state', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'lh1' });
    const before = JSON.stringify(s);
    const projected = simulateOneRound(s, {
      chump: [{ kind: 'build-factory' }],
      carnage: [],
    });
    expect(JSON.stringify(s)).toBe(before); // input unchanged
    expect(projected.round).toBe(2);
    expect(projected.leaders.chump.factories).toBe(11); // factory built
  });
});

describe('scoreState', () => {
  it('returns me.pop − max(other.pop) when no winner', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'lh2' });
    expect(scoreState(s, 'chump')).toBe(33 - 25); // chump 33, carnage 25
  });

  it('returns +1000 when viewer is the winner', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'lh3' });
    s.outcome = { type: 'survivor', winner: 'chump' };
    expect(scoreState(s, 'chump')).toBe(1000);
  });

  it('returns −1000 when another leader is the winner', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'lh4' });
    s.outcome = { type: 'survivor', winner: 'carnage' };
    expect(scoreState(s, 'chump')).toBe(-1000);
  });

  it('returns −500 for apocalypse outcome (worse than draw, better than outright loss)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'lh-apoc' });
    s.outcome = { type: 'apocalypse' };
    expect(scoreState(s, 'chump')).toBe(-500);
  });
});

describe('bestTargetByLookahead', () => {
  it('picks the target whose projected post-round state scores highest', () => {
    // 3-leader setup: chump can launch at carnage OR starmless. Both are weak (pop=5).
    // Carnage has shields=0 (launch lands); starmless has shields=5 (launch always intercepts).
    // Hard AI should prefer carnage (where the launch actually does damage, raising score).
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'hard', seed: 'lh5' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsLarge = 1;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.starmless.population = 5;
    s.leaders.starmless.stockpile.shields = 5;
    const baseline: Order[] = []; // no other orders this round
    const candidates: ['carnage', 'starmless'] = ['carnage', 'starmless'];
    const best = bestTargetByLookahead(s, 'chump', baseline, candidates, {
      delivery: 'missile', warhead: 'large', targetType: 'people',
    }, dispatch);
    expect(best).toBe('carnage');
  });

  it('returns null when candidates is empty', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'hard', seed: 'lh6' });
    const best = bestTargetByLookahead(s, 'chump', [], [], {
      delivery: 'missile', warhead: 'small', targetType: 'people',
    }, dispatch);
    expect(best).toBeNull();
  });

  it('mixed cast with no history: lookahead falls back to passive simulation for human', () => {
    const s = initialState({
      cast: ['chump', 'carnage', 'player1'],
      difficulty: 'hard',
      seed: 'lookahead-human-no-history',
    });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.population = 8;
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.player1.population = 8;
    s.leaders.player1.stockpile.shields = 0;
    // No lastOrders[player1] populated. Should not throw, should pick a target.
    const orders = planAi(s, 'chump');
    expect(orders.find((o) => o.kind === 'launch')).toBeDefined();
  });

  it('mixed cast with history: lookahead simulates human as repeating their last orders', () => {
    const s = initialState({
      cast: ['chump', 'carnage', 'player1'],
      difficulty: 'hard',
      seed: 'lookahead-human-with-history',
    });
    // Pre-populate lastOrders for player1 with a launch at chump.
    // Give player1 the stockpile that supports the launch in the simulated round.
    s.leaders.player1.stockpile.missiles = 1;
    s.leaders.player1.stockpile.warheadsSmall = 1;
    s.lastOrders = {
      player1: [{
        kind: 'launch',
        target: 'chump',
        delivery: 'missile',
        warhead: 'small',
        targetType: 'people',
      }],
    };
    // Set up so chump has a viable launch candidate
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.stockpile.shields = 0;
    // planAi should not throw, should produce some launch from chump.
    expect(() => planAi(s, 'chump')).not.toThrow();
  });
});
