import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { planAi } from '../../src/engine/ai';
import { isHuman } from '../../src/engine/state';
import type { Difficulty, GameState, LeaderId, ResolutionEvent } from '../../src/engine/types';
import { POLICIES, type PolicyName } from './humanPolicy';

// Fixed cast for the whole study so difficulty is the only independent variable:
// the human (player1) plus a spread of AI personalities — coward, rational,
// warmonger, glass-cannon.
export const CAST: LeaderId[] = ['player1', 'chump', 'carnage', 'netanyahoo', 'mileigh-hem'];
export const HUMAN: LeaderId = 'player1';
const ROUND_CAP = 60;

export interface GameRecord {
  seed: string;
  difficulty: Difficulty;
  cast: LeaderId[];
  rounds: number;
  finished: boolean;
  outcomeType: 'survivor' | 'pyrrhic' | 'apocalypse' | 'unfinished';
  winner: LeaderId | null;
  humanWon: boolean;
  humanSurvived: boolean;
  humanEliminatedRound: number | null;
  humanFinalPop: number;
  humanPlacement: number; // 1 = best final population
  humanLaunchesMade: number;
  humanLaunchesReceived: number;
  humanHitsLanded: number;
  humanHitsTaken: number;
  totalLaunches: number;
  totalImpacts: number;
  eliminations: number;
  finalPop: Record<string, number>;
  finalAlive: Record<string, boolean>;
}

interface RoundBeat {
  round: number;
  launches: number;
  impacts: number;
  eliminated: LeaderId[];
  humanPop: number;
}

function countEvents(events: ResolutionEvent[]) {
  let launches = 0;
  let impacts = 0;
  let humanLaunchesMade = 0;
  let humanLaunchesReceived = 0;
  let humanHitsLanded = 0;
  let humanHitsTaken = 0;
  const eliminated: LeaderId[] = [];
  for (const e of events) {
    if (e.kind === 'MissileLaunched') {
      launches++;
      if (e.from === HUMAN) humanLaunchesMade++;
      if (e.to === HUMAN) humanLaunchesReceived++;
    } else if (e.kind === 'ImpactPeople' || e.kind === 'ImpactInfrastructure') {
      impacts++;
      if (e.from === HUMAN) humanHitsLanded++;
      if (e.target === HUMAN) humanHitsTaken++;
    } else if (e.kind === 'LeaderEliminated') {
      eliminated.push(e.id);
    }
  }
  return {
    launches,
    impacts,
    eliminated,
    humanLaunchesMade,
    humanLaunchesReceived,
    humanHitsLanded,
    humanHitsTaken,
  };
}

export function playOneGame(
  difficulty: Difficulty,
  seed: string,
  policy: PolicyName = 'cautious',
): { record: GameRecord; beats: RoundBeat[] } {
  const humanPlay = POLICIES[policy];
  let s: GameState = initialState({ cast: CAST, difficulty, seed });
  let rounds = 0;
  let humanEliminatedRound: number | null = null;

  const beats: RoundBeat[] = [];
  const totals = {
    launches: 0,
    impacts: 0,
    eliminations: 0,
    humanLaunchesMade: 0,
    humanLaunchesReceived: 0,
    humanHitsLanded: 0,
    humanHitsTaken: 0,
  };

  while (!s.outcome && rounds < ROUND_CAP) {
    for (const id of CAST) {
      if (!s.leaders[id]?.alive) continue;
      const orders = isHuman(id) ? humanPlay(s, id) : planAi(s, id);
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    }
    const logLenBefore = s.log.length;
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    rounds++;

    const ev = countEvents(s.log.slice(logLenBefore));
    totals.launches += ev.launches;
    totals.impacts += ev.impacts;
    totals.eliminations += ev.eliminated.length;
    totals.humanLaunchesMade += ev.humanLaunchesMade;
    totals.humanLaunchesReceived += ev.humanLaunchesReceived;
    totals.humanHitsLanded += ev.humanHitsLanded;
    totals.humanHitsTaken += ev.humanHitsTaken;

    if (humanEliminatedRound === null && !s.leaders[HUMAN].alive) {
      humanEliminatedRound = rounds;
    }

    beats.push({
      round: rounds,
      launches: ev.launches,
      impacts: ev.impacts,
      eliminated: ev.eliminated,
      humanPop: s.leaders[HUMAN].population,
    });
  }

  const finished = s.outcome !== null;
  const outcomeType = !s.outcome ? 'unfinished' : s.outcome.type;
  const winner = s.outcome && 'winner' in s.outcome ? s.outcome.winner : null;

  const finalPop: Record<string, number> = {};
  const finalAlive: Record<string, boolean> = {};
  for (const id of CAST) {
    finalPop[id] = s.leaders[id].population;
    finalAlive[id] = s.leaders[id].alive;
  }

  // Placement: rank by final population, descending (eliminated => pop 0).
  const ranking = [...CAST].sort((a, b) => finalPop[b] - finalPop[a]);
  const humanPlacement = ranking.indexOf(HUMAN) + 1;

  const record: GameRecord = {
    seed,
    difficulty,
    cast: CAST,
    rounds,
    finished,
    outcomeType,
    winner,
    humanWon: winner === HUMAN,
    humanSurvived: s.leaders[HUMAN].alive,
    humanEliminatedRound,
    humanFinalPop: s.leaders[HUMAN].population,
    humanPlacement,
    humanLaunchesMade: totals.humanLaunchesMade,
    humanLaunchesReceived: totals.humanLaunchesReceived,
    humanHitsLanded: totals.humanHitsLanded,
    humanHitsTaken: totals.humanHitsTaken,
    totalLaunches: totals.launches,
    totalImpacts: totals.impacts,
    eliminations: totals.eliminations,
    finalPop,
    finalAlive,
  };

  return { record, beats };
}

function narrative(record: GameRecord, beats: RoundBeat[]): string {
  const fate = record.humanWon
    ? `WON (${record.outcomeType})`
    : record.humanSurvived
      ? `survived, placed #${record.humanPlacement}`
      : `eliminated round ${record.humanEliminatedRound}`;
  const lines: string[] = [];
  lines.push(`### ${record.seed} — ${fate}`);
  lines.push(
    `Outcome: **${record.outcomeType}**` +
      (record.winner ? ` (winner: ${record.winner})` : '') +
      ` · ${record.rounds} rounds · human final pop ${record.humanFinalPop}M · ` +
      `human launches ${record.humanLaunchesMade}/hits ${record.humanHitsLanded}, ` +
      `taken ${record.humanHitsTaken}`,
  );
  const hot = beats.filter((b) => b.launches > 0 || b.eliminated.length > 0);
  if (hot.length > 0) {
    const beatStr = hot
      .map((b) => {
        const elim = b.eliminated.length ? ` [☠ ${b.eliminated.join(', ')}]` : '';
        return `r${b.round}: ${b.launches} launches, ${b.impacts} impacts${elim}`;
      })
      .join('; ');
    lines.push(beatStr);
  } else {
    lines.push('_no launches — a cold-war stalemate._');
  }
  return lines.join('\n');
}

export function runLevel(
  difficulty: Difficulty,
  count: number,
  outRoot: string,
  policy: PolicyName = 'cautious',
): {
  level: Difficulty;
  count: number;
  dir: string;
} {
  const dir = join(outRoot, difficulty);
  mkdirSync(dir, { recursive: true });

  const records: GameRecord[] = [];
  const narratives: string[] = [];

  for (let i = 0; i < count; i++) {
    const seed = `${difficulty}-${i}`;
    const { record, beats } = playOneGame(difficulty, seed, policy);
    records.push(record);
    narratives.push(narrative(record, beats));
  }

  writeFileSync(
    join(dir, 'games.jsonl'),
    records.map((r) => JSON.stringify(r)).join('\n') + '\n',
    'utf8',
  );
  writeFileSync(
    join(dir, 'games.md'),
    `# ${difficulty} — ${count} games (human = player1, ${policy} policy)\n\n` +
      `Cast: ${CAST.join(', ')}\n\n` +
      narratives.join('\n\n') +
      '\n',
    'utf8',
  );

  return { level: difficulty, count, dir };
}
