import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore, opportunismScore, wasAttackedBy } from './scoring';
import { AI_SCORING_WEIGHTS } from '../balance';

/**
 * Carnage — Rational + Opportunist personality.
 *
 * Behavioural rules:
 * 1. Score targets by threat = threatScore (arsenal + recent_aggression) with
 *    escalation: if the target hit Carnage last round (recentAggressionFrom[target] > 0),
 *    multiply their threat score by carnageEscalationMultiplier.
 * 2. Add opportunismScore to the combined score to apply "finish them" bonus for
 *    weak targets.
 * 3. Launch at the highest (threat + opportunism) candidate.
 * 4. Propaganda only at leaders who have attacked Carnage
 *    (wasAttackedBy(state, 'carnage', candidate) === true).
 * 5. Reserve AP: launch (2) first, then propaganda (1 per attacker, capped by budget).
 */
export function planCarnage(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const orders: Order[] = [];
  let budget = me.ap;

  const LAUNCH_COST = 2;
  const PROPAGANDA_COST = 1;

  // --- Living non-self leaders ---
  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);

  // --- Identify attackers (for propaganda targeting) ---
  const attackers = others.filter((t) => wasAttackedBy(state, leaderId, t));

  // --- Score each candidate ---
  function combinedScore(target: LeaderId): number {
    const base = threatScore(state, leaderId, target);
    const escalated =
      (me.recentAggressionFrom[target] ?? 0) > 0
        ? base * AI_SCORING_WEIGHTS.carnageEscalationMultiplier
        : base;
    return escalated + opportunismScore(state, target);
  }

  // --- Pick the highest-scoring launch candidate ---
  let launchTarget: LeaderId | undefined;
  if (others.length > 0) {
    launchTarget = others.reduce((best, t) =>
      combinedScore(t) >= combinedScore(best) ? t : best,
    );
  }

  const canLaunch =
    launchTarget !== undefined &&
    me.stockpile.missiles >= 1 &&
    me.stockpile.warheadsSmall >= 1 &&
    budget >= LAUNCH_COST;

  // --- Reserve AP: launch, then propaganda at attackers ---
  const launchReserve = canLaunch ? LAUNCH_COST : 0;

  // Count how many propaganda orders we can afford after launch reserve.
  const propagandaBudget = budget - launchReserve;
  const propagandaSlots = Math.min(attackers.length, Math.max(0, propagandaBudget));

  const totalReserve = launchReserve + propagandaSlots * PROPAGANDA_COST;
  const buildBudget = budget - totalReserve;

  // --- 1. Builds: warheads with leftover budget ---
  let remaining = buildBudget;

  while (remaining >= 1) {
    const o: Order = { kind: 'build-warhead', yield: 'small' };
    if (validateOrder(state, leaderId, o).ok) {
      orders.push(o);
      remaining -= 1;
    } else {
      break;
    }
  }

  budget -= buildBudget - remaining;

  // --- 2. Launch at the best combined-score target ---
  if (canLaunch && launchTarget !== undefined && budget >= LAUNCH_COST) {
    const launch: Order = {
      kind: 'launch',
      target: launchTarget,
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    };
    if (validateOrder(state, leaderId, launch).ok) {
      orders.push(launch);
      budget -= apCostOf(launch);
    }
  }

  // --- 3. Propaganda only at leaders who attacked Carnage ---
  for (const attacker of attackers) {
    if (budget < PROPAGANDA_COST) break;
    const prop: Order = { kind: 'propaganda', target: attacker };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
    }
  }

  return orders;
}
