import type { LeaderId, ResolutionEvent } from './types';
import { nextRandom, nextInt } from './rng';

/** ~17.5% per ImpactPeople/ImpactInfrastructure event (spec Q5 trigger). */
export const CAMEO_PROB = 0.175;
/** ~33% per round (spec §2.3). */
export const COLUMN_PROB = 1 / 3;

export interface RollResult {
  fire: boolean;
  rngState: number;
}

export function shouldRollCameo(rngState: number): RollResult {
  const r = nextRandom(rngState);
  return { fire: r.value < CAMEO_PROB, rngState: r.state };
}

export function shouldRollColumn(rngState: number): RollResult {
  const r = nextRandom(rngState);
  return { fire: r.value < COLUMN_PROB, rngState: r.state };
}

export interface PickResult {
  namedLeader: LeaderId | undefined;
  rngState: number;
}

/**
 * Pick a leader for the Disparage column to criticise. Prefers a leader who
 * launched a missile this round; falls back to uniform random among living leaders.
 * Returns undefined if there are no living leaders.
 */
export function pickColumnNamedLeader(
  events: ResolutionEvent[],
  livingLeaders: LeaderId[],
  rngState: number,
): PickResult {
  if (livingLeaders.length === 0) {
    return { namedLeader: undefined, rngState };
  }

  const attackers = new Set<LeaderId>();
  for (const e of events) {
    if (e.kind === 'MissileLaunched' && livingLeaders.includes(e.from)) {
      attackers.add(e.from);
    }
  }

  const pool = attackers.size > 0
    ? [...attackers]
    : livingLeaders;

  const step = nextInt(rngState, pool.length);
  return { namedLeader: pool[step.value], rngState: step.state };
}
