import type { GameState, LeaderId, Yield } from '../../engine/types';

export interface Award {
  title: string;
  leaderId: LeaderId;
  detail: string;
}

const YIELD_RANK: Record<Yield, number> = { small: 1, medium: 2, large: 3 };
const RANK_YIELD: Record<number, Yield> = { 1: 'small', 2: 'medium', 3: 'large' };

interface LeaderStats {
  deathsCaused: number;
  bestYieldRank: number;
  launches: number;
}

/** Single pass over the cumulative game.log accumulating per-leader award metrics. */
function collectStats(game: GameState): { stats: Record<LeaderId, LeaderStats>; eliminationOrder: LeaderId[] } {
  const stats = {} as Record<LeaderId, LeaderStats>;
  for (const id of game.cast) {
    stats[id] = { deathsCaused: 0, bestYieldRank: 0, launches: 0 };
  }
  const eliminationOrder: LeaderId[] = [];
  for (const event of game.log) {
    switch (event.kind) {
      case 'MissileLaunched':
        stats[event.from].launches += 1;
        break;
      case 'ImpactPeople':
        stats[event.from].deathsCaused += event.deaths;
        stats[event.from].bestYieldRank = Math.max(stats[event.from].bestYieldRank, YIELD_RANK[event.warhead]);
        break;
      case 'ImpactInfrastructure':
        stats[event.from].bestYieldRank = Math.max(stats[event.from].bestYieldRank, YIELD_RANK[event.warhead]);
        break;
      case 'LeaderEliminated':
        eliminationOrder.push(event.id);
        break;
      default:
        break;
    }
  }
  return { stats, eliminationOrder };
}

/** Picks the max of `metric` over `cast` in cast order — ties go to the earlier entry. Returns undefined if nobody clears 0. */
function superlative(
  cast: LeaderId[],
  metric: (id: LeaderId) => number,
  build: (id: LeaderId, value: number) => Award,
): Award | undefined {
  let bestId: LeaderId | undefined;
  let bestValue = 0;
  for (const id of cast) {
    const value = metric(id);
    if (value > bestValue) {
      bestValue = value;
      bestId = id;
    }
  }
  return bestId === undefined ? undefined : build(bestId, bestValue);
}

/**
 * Comedic superlative awards derived from the cumulative game.log + final
 * leaders/outcome. One winner per category, cast-order tie-break, omitted
 * when nobody qualifies. No engine data beyond GameState is consulted.
 */
export function deriveAwards(
  game: GameState,
  _initialPopulations: Partial<Record<LeaderId, number>>,
): Award[] {
  const { stats, eliminationOrder } = collectStats(game);
  const awards: Award[] = [];

  const deadliest = superlative(
    game.cast,
    (id) => stats[id].deathsCaused,
    (id, deaths) => ({
      title: 'DEADLIEST',
      leaderId: id,
      detail: `${deaths}M on their conscience (conscience sold separately).`,
    }),
  );
  if (deadliest) awards.push(deadliest);

  const biggestBang = superlative(
    game.cast,
    (id) => stats[id].bestYieldRank,
    (id, rank) => ({
      title: 'BIGGEST BANG',
      leaderId: id,
      detail: `Dropped a ${RANK_YIELD[rank].toUpperCase()} warhead on somebody. Go big or go extinct.`,
    }),
  );
  if (biggestBang) awards.push(biggestBang);

  const triggerHappy = superlative(
    game.cast,
    (id) => stats[id].launches,
    (id, launches) => ({
      title: 'TRIGGER HAPPY',
      leaderId: id,
      detail: `${launches} launch${launches === 1 ? '' : 'es'}. Subtlety: none.`,
    }),
  );
  if (triggerHappy) awards.push(triggerHappy);

  if (eliminationOrder.length > 0) {
    awards.push({
      title: 'DIED FIRST',
      leaderId: eliminationOrder[0],
      detail: 'Set the tone. The tone was "dead."',
    });
  }

  if (game.outcome?.type === 'survivor') {
    awards.push({
      title: 'LAST ONE STANDING',
      leaderId: game.outcome.winner,
      detail: "Outlasted everyone. That's the whole prize.",
    });
  } else if (game.outcome?.type === 'pyrrhic') {
    awards.push({
      title: 'LAST TO FALL',
      leaderId: game.outcome.winner,
      detail: 'Outlasted everyone by about one round, then joined them anyway.',
    });
  }

  return awards;
}

/** Counts ImpactPeople/ImpactInfrastructure events with `side` (from/target) equal to `id`. */
function countImpacts(game: GameState, side: 'from' | 'target', id: LeaderId): number {
  let count = 0;
  for (const event of game.log) {
    if (event.kind === 'ImpactPeople' || event.kind === 'ImpactInfrastructure') {
      if (event[side] === id) count += 1;
    }
  }
  return count;
}

/**
 * A one-line honest epitaph for the human slot: fate (survived / eliminated /
 * last to fall) plus population lost and hits landed vs taken. Guarantees a
 * personal "how you died" beat even when the human wins no award.
 */
export function humanDemiseLine(
  game: GameState,
  initialPopulations: Partial<Record<LeaderId, number>>,
  humanId: LeaderId,
): string {
  const leader = game.leaders[humanId];
  const initial = initialPopulations[humanId] ?? leader.population;
  const final = leader.population;
  const popLost = Math.max(0, initial - final);
  const hitsLanded = countImpacts(game, 'from', humanId);
  const hitsTaken = countImpacts(game, 'target', humanId);
  const hitWord = (n: number) => `${n} hit${n === 1 ? '' : 's'}`;

  let fate: string;
  if (leader.alive) {
    fate = `${leader.name} survived`;
  } else if (game.outcome?.type === 'pyrrhic' && game.outcome.winner === humanId) {
    fate = `${leader.name} was the last to fall`;
  } else {
    fate = `${leader.name} was eliminated`;
  }

  return `${fate}. Lost ${popLost}M of ${initial}M. Landed ${hitWord(hitsLanded)}, took ${hitWord(hitsTaken)}.`;
}
