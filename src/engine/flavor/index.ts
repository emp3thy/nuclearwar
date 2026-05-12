import type { LeaderId } from '../types';
import { chumpBank } from './chump';
import { khameneverhereBank } from './khameneverhere';
import { netanyahooBank } from './netanyahoo';
import { carnageBank } from './carnage';
import { starmlessBank } from './starmless';
import { mileighhemBank } from './mileighhem';

export interface FlavorBank {
  preRoundMood: string[];
  preRoundMoodSnapBack: string;
  launch: string[];
  hit: string[];
  woo: string[];
  beingWooed: string[];
  propagandaSend: string[];
  propagandaReceive: string[];
  buildFactory: string[];
  buildDefence: string[];
  reaction: string[];
  death: string[];
  finalRetaliation: string[];
}

export type FlavorCategory = Exclude<keyof FlavorBank, 'preRoundMoodSnapBack'>;

const BANKS: Partial<Record<LeaderId, FlavorBank>> = {
  chump: chumpBank,
  khameneverhere: khameneverhereBank,
  netanyahoo: netanyahooBank,
  carnage: carnageBank,
  starmless: starmlessBank,
  'mileigh-hem': mileighhemBank,
};

// Generic fallback — used when a leader has no bank entry or a category is empty.
export const genericFallback: Record<FlavorCategory, string[]> = {
  preRoundMood: ['({leader} has filed orders.)'],
  launch: ['({leader} launches.)'],
  hit: ['({leader} took {damage}M casualties.)'],
  woo: ['({leader} sends a friendship overture.)'],
  beingWooed: ['({leader} receives a friendship overture.)'],
  propagandaSend: ['({leader} drops pamphlets.)'],
  propagandaReceive: ['({leader} reads pamphlets.)'],
  buildFactory: ['({leader} breaks ground.)'],
  buildDefence: ['({leader} reinforces defences.)'],
  reaction: ['({leader} responds.)'],
  death: ['({leader} has been eliminated.)'],
  finalRetaliation: ['({leader} launches Final Retaliation.)'],
};

export function getBank(leaderId: LeaderId): FlavorBank | undefined {
  return BANKS[leaderId];
}
