import type { GameState, LeaderId, WinOutcome } from './types';

export function checkOutcome(
  state: GameState,
  startOfRoundPop: Partial<Record<LeaderId, number>>,
): WinOutcome | null {
  const alive = state.cast.filter((id) => state.leaders[id].population > 0);

  // 1) Survivor — exactly one leader alive.
  if (alive.length === 1) {
    return { type: 'survivor', winner: alive[0] };
  }

  // 2) Pyrrhic / apocalypse — nobody alive.
  if (alive.length === 0) {
    let bestId: LeaderId | undefined;
    let bestPop = -1;
    for (const id of state.cast) {
      const p = startOfRoundPop[id] ?? 0;
      if (p > bestPop) {
        bestPop = p;
        bestId = id;
      }
    }
    if (bestPop > 0 && bestId) return { type: 'pyrrhic', winner: bestId };
    return { type: 'apocalypse' };
  }

  // 3) Dominance — leading population >= threshold * second-highest.
  const sortedByPop = [...alive].sort(
    (a, b) => state.leaders[b].population - state.leaders[a].population,
  );
  if (sortedByPop.length >= 2) {
    const lead = state.leaders[sortedByPop[0]].population;
    const next = state.leaders[sortedByPop[1]].population;
    if (next > 0 && lead >= state.config.dominanceThreshold * next) {
      return { type: 'dominance', winner: sortedByPop[0] };
    }
  }

  return null;
}
