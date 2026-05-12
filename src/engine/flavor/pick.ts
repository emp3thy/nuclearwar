import { nextInt } from '../rng';
import { genericFallback } from './index';
import type { FlavorBank, FlavorCategory } from './index';

export interface PickResult {
  quote: string;
  rngState: number;
}

export interface PickOptions {
  /** When true, returns the snap-back line for preRoundMood without drawing. */
  snapBack?: boolean;
  /** {token} → value substitutions applied to the chosen line. Tokens not in this map cause their host line to be filtered before drawing. */
  substitutions?: Record<string, string>;
}

const TOKEN_RE = /\{(\w+)\}/g;

function applySubstitutions(line: string, subs: Record<string, string>): string {
  return line.replace(TOKEN_RE, (_, key) => (key in subs ? subs[key] : `{${key}}`));
}

function eligible(line: string, subs: Record<string, string>): boolean {
  // A line is eligible if every token it contains is in subs.
  for (const match of line.matchAll(TOKEN_RE)) {
    if (!(match[1] in subs)) return false;
  }
  return true;
}

export function pickLine(
  bank: FlavorBank,
  category: FlavorCategory,
  rngState: number,
  opts: PickOptions = {},
): PickResult {
  if (category === 'preRoundMood' && opts.snapBack) {
    return { quote: bank.preRoundMoodSnapBack, rngState };
  }
  const subs = opts.substitutions ?? {};
  const candidates = bank[category].filter((l) => eligible(l, subs));
  if (candidates.length === 0) {
    // Generic fallback. Generic templates may have a {leader} token; substitute if present.
    const fallback = genericFallback[category][0];
    return { quote: applySubstitutions(fallback, subs), rngState };
  }
  const step = nextInt(rngState, candidates.length);
  const chosen = candidates[step.value];
  return { quote: applySubstitutions(chosen, subs), rngState: step.state };
}
