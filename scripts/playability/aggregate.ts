import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameRecord } from './runner';

// Usage: vite-node scripts/playability/aggregate.ts <level> [outRoot]
// Prints a JSON stats block computed from that level's games.jsonl.

const [level, outArg] = process.argv.slice(2);
const outRoot = outArg ?? 'docs/playability';
if (!level) throw new Error('level required');

const raw = readFileSync(join(outRoot, level, 'games.jsonl'), 'utf8').trim();
const rows: GameRecord[] = raw.split('\n').map((l) => JSON.parse(l));
const n = rows.length;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round2 = (x: number) => Math.round(x * 100) / 100;

const count = <T>(xs: T[], pred: (x: T) => boolean) => xs.filter(pred).length;
const dist = <K extends string>(xs: K[]) => {
  const d: Record<string, number> = {};
  for (const x of xs) d[x] = (d[x] ?? 0) + 1;
  return d;
};

const finished = count(rows, (r) => r.finished);
const humanWins = count(rows, (r) => r.humanWon);
const humanSurvives = count(rows, (r) => r.humanSurvived);
const humanWinOrSurvive = count(rows, (r) => r.humanWon || r.humanSurvived);

const stats = {
  level,
  games: n,
  finished,
  unfinished: n - finished,
  outcomeDist: dist(rows.map((r) => r.outcomeType)),
  winnerDist: dist(rows.map((r) => r.winner ?? 'none')),
  human: {
    winRatePct: round2((100 * humanWins) / n),
    survivalRatePct: round2((100 * humanSurvives) / n),
    winOrSurviveRatePct: round2((100 * humanWinOrSurvive) / n),
    avgPlacement: round2(mean(rows.map((r) => r.humanPlacement))),
    placementDist: dist(rows.map((r) => String(r.humanPlacement))),
    avgFinalPop: round2(mean(rows.map((r) => r.humanFinalPop))),
    avgEliminatedRound: (() => {
      const elim = rows
        .filter((r) => r.humanEliminatedRound !== null)
        .map((r) => r.humanEliminatedRound as number);
      // null (not 0) when the human was never eliminated in any game, so the
      // stat can't be misread as "eliminated at round 0".
      return elim.length ? round2(mean(elim)) : null;
    })(),
    avgLaunchesMade: round2(mean(rows.map((r) => r.humanLaunchesMade))),
    avgLaunchesReceived: round2(mean(rows.map((r) => r.humanLaunchesReceived))),
    avgHitsLanded: round2(mean(rows.map((r) => r.humanHitsLanded))),
    avgHitsTaken: round2(mean(rows.map((r) => r.humanHitsTaken))),
  },
  game: {
    avgRounds: round2(mean(rows.map((r) => r.rounds))),
    medianRounds: median(rows.map((r) => r.rounds)),
    minRounds: Math.min(...rows.map((r) => r.rounds)),
    maxRounds: Math.max(...rows.map((r) => r.rounds)),
    avgTotalLaunches: round2(mean(rows.map((r) => r.totalLaunches))),
    avgTotalImpacts: round2(mean(rows.map((r) => r.totalImpacts))),
    avgEliminations: round2(mean(rows.map((r) => r.eliminations))),
  },
};

// eslint-disable-next-line no-console
console.log(JSON.stringify(stats, null, 2));
