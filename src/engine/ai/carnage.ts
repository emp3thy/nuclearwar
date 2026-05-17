import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore, opportunismScore, wasAttackedBy } from './scoring';
import { AI_SCORING_WEIGHTS } from '../balance';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Carnage — Rational + Opportunist personality (P4c.2 rework).
 *
 * Aggressive-rational. Ranks targets by threat (with escalation against
 * leaders who hit Carnage last round) + opportunism. Keeps the P4c.1 bomber
 * bias: builds toward a fleet of 3 reusable bombers; launchSalvo prefers bomber
 * delivery. Moderate launch cap. Propaganda only at attackers.
 */
const PROPAGANDA_COST = 1;
const CARNAGE_MAX_LAUNCHES = 3;

// P4c.2 supersedes P4c.1's single-shot bomber rule: Carnage builds a small
// REUSABLE bomber fleet so his moderate-cap salvo has real multi-launch.
// Bombers return on impact (P4c.1 rule), so 3 bombers = 3 launches/round.
const CARNAGE_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'bomber' }, target: 3 },
  { build: { item: 'warhead', yield: 'small' }, target: 4 },
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
];

export function planCarnage(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);
  const attackers = others.filter((t) => wasAttackedBy(state, leaderId, t));

  function combinedScore(target: LeaderId): number {
    const base = threatScore(state, leaderId, target);
    const escalated =
      (me.recentAggressionFrom[target] ?? 0) > 0
        ? base * AI_SCORING_WEIGHTS.carnageEscalationMultiplier
        : base;
    return escalated + opportunismScore(state, target);
  }

  const rankedTargets = [...others].sort((a, b) => combinedScore(b) - combinedScore(a));

  // Reserve 1 AP per attacker for propaganda (capped so it never starves offence).
  const propagandaReserve = Math.min(attackers.length, Math.max(0, budget - 2));
  const offenceBudget = budget - propagandaReserve;

  // Launch first (moderate cap), then build with the remainder.
  const salvo = launchSalvo(state, leaderId, {
    budget: offenceBudget,
    rankedTargets,
    maxLaunches: CARNAGE_MAX_LAUNCHES,
  });
  const build = buildToward(
    state, leaderId, CARNAGE_BUILD_PLAN, offenceBudget - salvo.apSpent,
  );
  budget -= salvo.apSpent + build.apSpent;

  const orders: Order[] = [...build.orders, ...salvo.orders];

  // Propaganda only at leaders who attacked Carnage.
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
