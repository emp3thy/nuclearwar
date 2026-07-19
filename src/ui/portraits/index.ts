import type { LeaderId } from '../../engine/types';
import {
  CarnageFace, ChumpFace, DisparageFace, GrouchoFace,
  KhameneverhereFace, MileighFace, NetanyahooFace, StarmlessFace,
} from './faces';

/** Face component per AI leader; every human slot maps to the Groucho disguise. */
export const FACES: Record<string, () => JSX.Element> = {
  chump: ChumpFace,
  netanyahoo: NetanyahooFace,
  khameneverhere: KhameneverhereFace,
  starmless: StarmlessFace,
  carnage: CarnageFace,
  'mileigh-hem': MileighFace,
  disparage: DisparageFace,
  player1: GrouchoFace,
  player2: GrouchoFace,
  player3: GrouchoFace,
  player4: GrouchoFace,
  player5: GrouchoFace,
};

/** Signature disc color + badge flag for the fixed cast.
 * Colors are concrete hexes (mirroring tokens.css `--c-*`) so they work both as
 * CSS backgrounds and as SVG `fill` attributes (WorldMap country ellipses,
 * slice-3 spec §5.3 — interpolating `var(--c-<leaderId>)` would yield undefined
 * custom properties for the long ids). Keep in sync with tokens.css. */
export const PORTRAIT_META: Record<string, { color: string; flag: string }> = {
  chump: { color: '#d6293f', flag: '🇺🇸' },
  netanyahoo: { color: '#1a4d8c', flag: '🇮🇱' },
  khameneverhere: { color: '#1f5e3a', flag: '🇮🇷' },
  starmless: { color: '#8a1729', flag: '🇬🇧' },
  carnage: { color: '#b22535', flag: '🇨🇦' },
  'mileigh-hem': { color: '#e6a517', flag: '🇦🇷' },
  disparage: { color: '#5a3e8a', flag: '🇬🇧' },
};

/** Fixed per-slot accent for human (Groucho) portraits — spec §3. */
export const HUMAN_ACCENTS: Record<string, string> = {
  player1: 'var(--cyan)',
  player2: 'var(--green)',
  player3: 'var(--yellow-soft)',
  player4: 'var(--magenta-deep)',
  player5: 'var(--ink-soft)',
};

const LEADING_FLAG = /^(\p{RI}\p{RI}|\p{Extended_Pictographic})/u;

/** Leading flag/emoji of a country string ("🇺🇸 US" → "🇺🇸"), 🌐 fallback. */
export function extractFlag(country: string): string {
  const m = country.trim().match(LEADING_FLAG);
  return m ? m[0] : '🌐';
}

/** Country string without its leading flag/emoji ("🇺🇸 US" → "US"); identity when no flag. */
export function stripFlag(country: string): string {
  return country.trim().replace(LEADING_FLAG, '').trimStart();
}

export type { LeaderId };
