import type { Yield } from './types';
import { YIELD_DAMAGE } from './balance';

// Spec §6 overwhelm curve: N <= S → 1.0; overflow N-S → 0.75 / 0.5 / 0.25 / 0.
// Zero defenders (nothing deployed) → no intercept chance.
export function interceptProbability(nthIncoming: number, defenders: number): number {
  if (defenders <= 0) return 0;
  if (nthIncoming <= defenders) return 1.0;
  const overflow = nthIncoming - defenders;
  if (overflow === 1) return 0.75;
  if (overflow === 2) return 0.5;
  if (overflow === 3) return 0.25;
  return 0;
}

export function peopleDeaths(y: Yield, currentPop: number): number {
  return Math.min(YIELD_DAMAGE[y].peopleDeaths, currentPop);
}

export function factoriesDestroyed(y: Yield, currentFactories: number): number {
  return Math.min(YIELD_DAMAGE[y].factoriesDestroyed, currentFactories);
}
