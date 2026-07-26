import { initialState, isHuman } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { planAi } from '../../src/engine/ai';
import type { Difficulty, GameState, Yield } from '../../src/engine/types';
import { humanOrders } from './humanPolicy';
import { CAST, HUMAN } from './runner';

// Deterministic re-play of the same 100 seeds per level, instrumented for the
// three follow-up questions: AI warhead-size mix, hoard-vs-fire behaviour, and
// game length. AI = every cast member except the human (player1).

const ROUND_CAP = 60;

function analyse(level: Difficulty, count: number) {
  const yieldsBuilt: Record<Yield, number> = { small: 0, medium: 0, large: 0 };
  const yieldsFired: Record<Yield, number> = { small: 0, medium: 0, large: 0 };
  let aiWarheadsBuilt = 0;
  let aiLaunches = 0;
  let aiLeftoverWarheadsAtEnd = 0;
  // Launch cadence: AI launches bucketed into game thirds (early/mid/late).
  const cadence = { early: 0, mid: 0, late: 0 };
  let totalRounds = 0;

  for (let g = 0; g < count; g++) {
    const seed = `${level}-${g}`;
    let s: GameState = initialState({ cast: CAST, difficulty: level, seed });
    let rounds = 0;
    const perRoundAiLaunches: number[] = [];

    while (!s.outcome && rounds < ROUND_CAP) {
      for (const id of CAST) {
        if (!s.leaders[id]?.alive) continue;
        const orders = isHuman(id) ? humanOrders(s, id) : planAi(s, id);
        s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
      }
      const before = s.log.length;
      s = reduce(s, { type: 'RESOLVE_ROUND' });
      rounds++;

      let roundAiLaunches = 0;
      for (const e of s.log.slice(before)) {
        if (e.kind === 'WarheadBuilt' && e.by !== HUMAN) {
          yieldsBuilt[e.yield]++;
          aiWarheadsBuilt++;
        } else if (e.kind === 'MissileLaunched' && e.from !== HUMAN) {
          yieldsFired[e.warhead]++;
          aiLaunches++;
          roundAiLaunches++;
        }
      }
      perRoundAiLaunches.push(roundAiLaunches);
    }

    // Leftover AI warheads still in stockpile when the game ended.
    for (const id of CAST) {
      if (id === HUMAN) continue;
      const st = s.leaders[id].stockpile;
      aiLeftoverWarheadsAtEnd += st.warheadsSmall + st.warheadsMedium + st.warheadsLarge;
    }

    // Bucket this game's AI launches into thirds of its own length.
    const n = perRoundAiLaunches.length;
    for (let r = 0; r < n; r++) {
      const frac = r / n;
      if (frac < 1 / 3) cadence.early += perRoundAiLaunches[r];
      else if (frac < 2 / 3) cadence.mid += perRoundAiLaunches[r];
      else cadence.late += perRoundAiLaunches[r];
    }
    totalRounds += rounds;
  }

  const pct = (x: number, total: number) => (total ? Math.round((1000 * x) / total) / 10 : 0);
  const builtTot = yieldsBuilt.small + yieldsBuilt.medium + yieldsBuilt.large;
  const firedTot = yieldsFired.small + yieldsFired.medium + yieldsFired.large;
  const cadenceTot = cadence.early + cadence.mid + cadence.late;

  return {
    level,
    games: count,
    avgRounds: Math.round((100 * totalRounds) / count) / 100,
    aiWarheadMix: {
      built: { small: pct(yieldsBuilt.small, builtTot), medium: pct(yieldsBuilt.medium, builtTot), large: pct(yieldsBuilt.large, builtTot) },
      fired: { small: pct(yieldsFired.small, firedTot), medium: pct(yieldsFired.medium, firedTot), large: pct(yieldsFired.large, firedTot) },
    },
    hoardVsFire: {
      aiWarheadsBuilt,
      aiLaunches,
      firedPerBuiltPct: pct(aiLaunches, aiWarheadsBuilt),
      aiLeftoverWarheadsAtEnd,
      leftoverPerGame: Math.round((100 * aiLeftoverWarheadsAtEnd) / count) / 100,
    },
    launchCadenceByGameThird: {
      earlyPct: pct(cadence.early, cadenceTot),
      midPct: pct(cadence.mid, cadenceTot),
      latePct: pct(cadence.late, cadenceTot),
    },
  };
}

const level = (process.argv[2] ?? 'normal') as Difficulty;
const count = Number(process.argv[3] ?? '100');
// eslint-disable-next-line no-console
console.log(JSON.stringify(analyse(level, count), null, 2));
