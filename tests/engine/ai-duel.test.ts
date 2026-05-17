import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { planAi } from '../../src/engine/ai';
import type { LeaderId, WinType } from '../../src/engine/types';

const FULL_CAST: LeaderId[] = ['chump', 'khameneverhere', 'starmless', 'carnage', 'mileigh-hem', 'netanyahoo'];

function runOneGame(seed: string, maxRounds = 100): { winner: LeaderId | null; type: WinType | null; rounds: number } {
  let s = initialState({
    cast: FULL_CAST,
    difficulty: 'normal',
    seed,
  });
  let rounds = 0;
  while (!s.outcome && rounds < maxRounds) {
    for (const id of FULL_CAST) {
      const orders = planAi(s, id);
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    }
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    rounds++;
  }
  return {
    winner: s.outcome?.type === 'apocalypse' ? null : s.outcome?.winner ?? null,
    type: s.outcome?.type ?? null,
    rounds,
  };
}

describe('AI-duel headless', () => {
  // P2 ships the duel infrastructure WITHOUT balance assertions.
  //
  // The first run of this test (commit during P2 Task 12) showed:
  //   chump 17 / khameneverhere 0 / starmless 0 / carnage 6 / mileigh-hem 0 / netanyahoo 39 / unfinished 38
  //
  // That distribution reflects two known P2 imbalances:
  //   - Mutual shield-saturation in 6-leader games leads to ~38% stalemates
  //     within 100 rounds (P1's shield-stalemate; raising maxRounds to 300
  //     does not help — the equilibrium is stable).
  //   - Reactive AIs (Khameneverhere/Starmless/Mileigh-hem) require an
  //     attacker to bootstrap; in a passive-AI grid they never launch.
  //
  // Per the plan's documented assumption, the AI scoring weights are first-pass
  // numbers; full balance tuning is deferred to P4. This test therefore asserts
  // only "infrastructure works" (engine runs 100 games without crashing,
  // counts add up). It prints the win distribution so the P4 balance pass has
  // a reproducible baseline to tune against.
  //
  // P2 baseline distribution shown above is now stale. P4b doubled the AP pool
  // and changed defences to consumable; the AI duel will produce a different
  // distribution. P4c uses the new distribution as the tuning baseline. This
  // test continues to assert only "no crash" — it has no balance assertions.
  //
  // P4c slice 1 shifts the distribution again: bomber reuse (engine rule) means
  // successful bomber launches return the bomber to stock, and Carnage now builds
  // and launches bombers preferentially. Slice 2+ treats the post-slice-1
  // distribution as its new baseline for balance assertions and further tuning.
  it('runs 100 all-AI games over full cast without crashing (balance assertions deferred to P4)', () => {
    // Player1..player5 are zero-initialised because the duel is AI-only and
    // never includes player slots — kept to satisfy Record<LeaderId | 'NOBODY'>.
    const wins: Record<LeaderId | 'NOBODY', number> = {
      chump: 0, khameneverhere: 0, starmless: 0,
      carnage: 0, 'mileigh-hem': 0, netanyahoo: 0,
      player1: 0, player2: 0, player3: 0, player4: 0, player5: 0,
      NOBODY: 0,
    };
    let unfinished = 0;
    for (let i = 0; i < 100; i++) {
      const r = runOneGame(`duel-${i}`);
      if (r.winner) wins[r.winner]++;
      else if (r.type === 'apocalypse') wins.NOBODY++;
      else unfinished++;
    }

    // Print distribution for human review (P4 balance pass uses this).
    // eslint-disable-next-line no-console
    console.table({ wins, unfinished });

    // Sanity: 100 games started, 100 outcomes counted (no engine crash mid-game).
    const totalCounted =
      wins.chump + wins.khameneverhere + wins.starmless + wins.carnage +
      wins['mileigh-hem'] + wins.netanyahoo + wins.NOBODY + unfinished;
    expect(totalCounted).toBe(100);
  }, 60_000);
});
