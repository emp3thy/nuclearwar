import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { planAi } from '../../src/engine/ai';
import type { LeaderId, WinType } from '../../src/engine/types';

const FULL_CAST: LeaderId[] = ['chump', 'khameneverhere', 'starmless', 'carnage', 'mileigh-hem', 'netanyahoo'];

// Round cap is a TEST TRIPWIRE, not a game rule. With the P4c.2 aggression
// rework + elimination-only endings, all-AI games terminate by elimination /
// apocalypse / pyrrhic. If this assertion ever fires, that is a balance bug to
// fix — not a cap to add to the game.
const ROUND_CAP = 60;

function runOneGame(seed: string): { type: WinType | null; rounds: number } {
  let s = initialState({ cast: FULL_CAST, difficulty: 'normal', seed });
  let rounds = 0;
  while (!s.outcome && rounds < ROUND_CAP) {
    for (const id of FULL_CAST) {
      const orders = planAi(s, id);
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    }
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    rounds++;
  }
  return { type: s.outcome?.type ?? null, rounds };
}

describe('AI-duel headless (P4c.2)', () => {
  it('every seeded all-AI game terminates within the round cap', () => {
    const SEEDS = 40;
    let unfinished = 0;
    let maxRounds = 0;
    for (let i = 0; i < SEEDS; i++) {
      const r = runOneGame(`duel-${i}`);
      if (r.type === null) unfinished++;
      if (r.rounds > maxRounds) maxRounds = r.rounds;
    }
    // eslint-disable-next-line no-console
    console.log(`AI-duel: ${SEEDS} games, max rounds = ${maxRounds}, unfinished = ${unfinished}`);
    expect(unfinished).toBe(0);
  }, 60_000);
});
