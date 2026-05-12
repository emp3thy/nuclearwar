import type { WinOutcome } from './types';
import { nextInt } from './rng';

export const MASTHEAD_POOL: readonly string[] = [
  'The Grauniad',
  'The Torygraph',
  'The Daily Wail',
  'The Mop and Pail',
  'The Old Gray Lady',
  'The Failing New York Times',
  'The LA Slimes',
  'McPaper',
  'The Granny Herald',
  'Pravda',
  'The End Times',
  'The Daily Detonator',
  'The Doomscroll Daily',
  'The Mushroom Cloud Times',
  'The Fallout Express',
];

export const APOCALYPSE_MASTHEAD = 'THE END TIMES — FINAL EDITION';

export interface ShuffleResult {
  order: string[];
  rngState: number;
}

/** Fisher-Yates shuffle, threaded through the seeded RNG. */
export function shuffleMastheads(rngState: number): ShuffleResult {
  const order = [...MASTHEAD_POOL];
  let s = rngState;
  for (let i = order.length - 1; i > 0; i--) {
    const step = nextInt(s, i + 1);
    s = step.state;
    const j = step.value;
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { order, rngState: s };
}

export function pickMasthead(
  order: string[],
  round: number,
  outcome: WinOutcome | null,
): string {
  if (outcome?.type === 'apocalypse') return APOCALYPSE_MASTHEAD;
  return order[(round - 1) % order.length];
}
