import type { GameState, LeaderId } from '../types';
import { AI_SCORING_WEIGHTS } from '../balance';

export function threatScore(state: GameState, viewer: LeaderId, target: LeaderId): number {
  if (viewer === target) return 0;
  const t = state.leaders[target];
  if (!t || !t.alive) return 0;
  const w = AI_SCORING_WEIGHTS.threat;
  const arsenal =
    t.stockpile.missiles * w.perMissile +
    t.stockpile.bombers * w.perBomber +
    t.stockpile.warheadsSmall * w.perWarheadSmall +
    t.stockpile.warheadsMedium * w.perWarheadMedium +
    t.stockpile.warheadsLarge * w.perWarheadLarge;
  const aggression = (state.leaders[viewer].recentAggressionFrom[target] ?? 0) * w.perRecentAggression;
  return arsenal + aggression;
}

export function opportunismScore(state: GameState, target: LeaderId): number {
  const t = state.leaders[target];
  if (!t || !t.alive) return 0;
  const w = AI_SCORING_WEIGHTS.opportunism;
  let score = 0;
  if (t.population < 10) score += w.perPopBelow10M * (10 - t.population);
  if (t.factories < 3) score += w.perFactoryBelow3 * (3 - t.factories);
  score += w.perDefenceShield * t.stockpile.shields;
  score += w.perDefenceAa * t.stockpile.aa;
  return score;
}

export function defenceVisibilityScore(state: GameState, target: LeaderId): number {
  const t = state.leaders[target];
  if (!t) return 0;
  return t.stockpile.shields + t.stockpile.aa;
}

export function populationAdvantage(state: GameState, viewer: LeaderId, target: LeaderId): number {
  return (state.leaders[viewer]?.population ?? 0) - (state.leaders[target]?.population ?? 0);
}

export function wasAttackedBy(state: GameState, viewer: LeaderId, attacker: LeaderId): boolean {
  const me = state.leaders[viewer];
  if (!me) return false;
  return (me.grudge[attacker] ?? 0) > 0 || (me.recentAggressionFrom[attacker] ?? 0) > 0;
}

export function topGrudgeTarget(state: GameState, viewer: LeaderId): LeaderId | null {
  const me = state.leaders[viewer];
  if (!me) return null;
  let best: LeaderId | null = null;
  let bestVal = 0;
  for (const k of Object.keys(me.grudge) as LeaderId[]) {
    const v = me.grudge[k] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return best;
}
