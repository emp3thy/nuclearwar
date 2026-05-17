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

  return null;
}
