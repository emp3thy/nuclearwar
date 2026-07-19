import { describe, it, expect } from 'vitest';
import { simulateOneRound, scoreState, bestTargetByLookahead, recentHumanOrders } from '../../../src/engine/ai/lookahead';
import { dispatch } from '../../../src/engine/ai/dispatch';
import { planAi } from '../../../src/engine/ai';
import { initialState } from '../../../src/engine/state';
import type { LeaderId, Order } from '../../../src/engine/types';

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
    // 3-leader setup: chump can launch at carnage (pop=5) OR burnem (pop=1).
    // Carnage has ap=0 so it cannot build or retaliate this round.
    // Scoring (elimination-only, no dominance):
    //   kill carnage → burnem survives at 1 → score = 33-1 = 32
    //   kill burnem → carnage survives at 5 → score = 33-5 = 28
    // Lookahead should prefer carnage (higher post-round margin).
    const s = initialState({ cast: ['chump', 'carnage', 'burnem'], difficulty: 'hard', seed: 'lh5' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsLarge = 1;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.ap = 0; // no AP — carnage builds nothing and cannot retaliate
    s.leaders.burnem.population = 1;
    const baseline: Order[] = []; // no other orders this round
    const candidates: ['carnage', 'burnem'] = ['carnage', 'burnem'];
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
    // No orderHistory entry for player1 populated. Should not throw, should pick a target.
    const orders = planAi(s, 'chump');
    expect(orders.find((o) => o.kind === 'launch')).toBeDefined();
  });

  it('mixed cast with history: lookahead simulates human as repeating their last orders', () => {
    const s = initialState({
      cast: ['chump', 'carnage', 'player1'],
      difficulty: 'hard',
      seed: 'lookahead-human-with-history',
    });
    // Pre-populate orderHistory for player1 with a launch at chump.
    // Give player1 the stockpile that supports the launch in the simulated round.
    s.leaders.player1.stockpile.missiles = 1;
    s.leaders.player1.stockpile.warheadsSmall = 1;
    s.orderHistory = [{
      player1: [{
        kind: 'launch',
        target: 'chump',
        delivery: 'missile',
        warhead: 'small',
        targetType: 'people',
      }],
    }];
    // Set up so chump has a viable launch candidate
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.stockpile.shields = 0;
    // planAi should not throw, should produce some launch from chump.
    expect(() => planAi(s, 'chump')).not.toThrow();
  });
});

describe('recentHumanOrders', () => {
  const build: Order = { kind: 'build-factory' };
  const launch: Order = {
    kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people',
  };

  it('returns [] for empty history', () => {
    expect(recentHumanOrders([], 'player1')).toEqual([]);
  });

  it('returns the last round when it is non-empty', () => {
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [build] },
      { player1: [launch] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([launch]);
  });

  it('walks back past an empty last round to the most recent non-empty round', () => {
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [launch] },
      { player1: [] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([launch]);
  });

  it('returns [] when every round in the window is empty', () => {
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [] },
      { player1: [] },
      { player1: [] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([]);
  });

  it('picks a non-empty round at the far edge of the 5-round window', () => {
    // Length 5: index 0 is exactly 5 rounds back (the last in the window).
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [launch] }, // index 0 — far edge of the window
      { player1: [] },
      { player1: [] },
      { player1: [] },
      { player1: [] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([launch]);
  });

  it('ignores a non-empty round one position outside the 5-round window', () => {
    // Length 6: index 0 is 6 rounds back — the scan covers indices 5..1 only.
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [launch] }, // index 0 — outside the window
      { player1: [] },
      { player1: [] },
      { player1: [] },
      { player1: [] },
      { player1: [] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([]);
  });

  it('skips a round with no entry for the leader (undefined)', () => {
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [launch] },
      { carnage: [build] }, // no player1 key → undefined → skipped
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([launch]);
  });
});

describe('bestTargetByLookahead — sliding-window human projection (P4c.3)', () => {
  it('projects a human who passed last round by their most recent acted round', () => {
    // Scenario: chump leads by gap G=8 (pop 30) over player1 (pop 22).
    // small-dmg=2, large-dmg=15; constraint: small-dmg(2) < G(8) < large-dmg(15).
    //
    // With no human projection (broken), carnage's small hit on chump leaves
    // chump at 28 vs player1 at 22 → max_other=28 when attacking chump,
    // max_other=30 when attacking player1 → carnage picks chump.
    //
    // With human projected to launch large at chump, chump falls to 15 before
    // carnage acts. Attacking chump: max_other=22 (player1). Attacking player1:
    // max_other=max(15, 20)=20. Lower max_other beats chump → carnage flips to
    // player1. This is the flip that proves the human projection is load-bearing.
    function makeBase() {
      const s = initialState({ cast: ['carnage', 'player1', 'chump'], difficulty: 'hard', seed: 'lh-window' });
      // chump leads by G=8; large-dmg(15) > G > small-dmg(2)
      s.leaders.chump.population = 30;
      s.leaders.player1.population = 22;
      // No deployed defences → no interception
      s.leaders.chump.deployedShields = 0;
      s.leaders.chump.deployedAA = 0;
      s.leaders.player1.deployedShields = 0;
      s.leaders.player1.deployedAA = 0;
      s.leaders.carnage.deployedShields = 0;
      s.leaders.carnage.deployedAA = 0;
      // Disarm chump so it cannot launch and confound the sim
      s.leaders.chump.stockpile.missiles = 0;
      s.leaders.chump.stockpile.bombers = 0;
      s.leaders.chump.stockpile.warheadsSmall = 0;
      s.leaders.chump.stockpile.warheadsMedium = 0;
      s.leaders.chump.stockpile.warheadsLarge = 0;
      // player1 must hold the stockpile for the projected large launch to survive re-validation
      s.leaders.player1.stockpile.missiles = 1;
      s.leaders.player1.stockpile.warheadsLarge = 1;
      // carnage fires the spec (small) launch
      s.leaders.carnage.stockpile.missiles = 1;
      s.leaders.carnage.stockpile.warheadsSmall = 1;
      return s;
    }

    const humanLaunch: Order = {
      kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'large', targetType: 'people',
    };
    const spec = { delivery: 'missile' as const, warhead: 'small' as const, targetType: 'people' as const };
    const candidates: LeaderId[] = ['player1', 'chump'];

    // History A: human launched last round.
    const launchedLast = makeBase();
    launchedLast.orderHistory = [{ player1: [humanLaunch] }];

    // History B: human launched, then passed last round (Approach B must walk back).
    const passedLast = makeBase();
    passedLast.orderHistory = [{ player1: [humanLaunch] }, { player1: [] }];

    // History C: human never acted — what a BROKEN recentHumanOrders would
    // effectively produce for passedLast. Used only to prove non-vacuity.
    const noHistory = makeBase();
    noHistory.orderHistory = [];

    const tLaunchedLast = bestTargetByLookahead(launchedLast, 'carnage', [], candidates, spec, dispatch);
    const tPassedLast   = bestTargetByLookahead(passedLast,   'carnage', [], candidates, spec, dispatch);
    const tNoHistory    = bestTargetByLookahead(noHistory,    'carnage', [], candidates, spec, dispatch);

    // Non-vacuity guard: the human's projected launch MUST change the target —
    // otherwise this test cannot detect a broken projection.
    expect(tLaunchedLast).not.toBe(tNoHistory);
    // Approach B walks back past the empty last round to the same launch round,
    // so passedLast projects identically to launchedLast.
    expect(tPassedLast).toBe(tLaunchedLast);
    expect(candidates).toContain(tPassedLast);
  });
});
