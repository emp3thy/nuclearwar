import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore, wasAttackedBy } from './scoring';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Netanyahoo — Warmonger personality (P4c.2 rework).
 *
 * Hardest-hitting personality. Launch-first (uncapped salvo), then build the
 * remainder toward a yield ramp. Chump-exception preserved: no launch at Chump
 * until Chump has attacked first. Propaganda exclusively at Chump.
 */
const PROPAGANDA_COST = 1;

const NETANYAHOO_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 6 },
  { build: { item: 'warhead', yield: 'small' }, target: 4 },
  { build: { item: 'warhead', yield: 'medium' }, target: 3 },
  { build: { item: 'warhead', yield: 'large' }, target: 2 },
];

export function planNetanyahoo(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);
  const chumpAlive = state.cast.includes('chump') && state.leaders['chump']?.alive === true;
  const chumpProvoked = wasAttackedBy(state, leaderId, 'chump');

  // Launch candidates: exclude Chump unless he has attacked first.
  const launchCandidates = others.filter((t) => t !== 'chump' || chumpProvoked);
  // Rank by threat, highest first.
  const rankedTargets = [...launchCandidates].sort(
    (a, b) => threatScore(state, leaderId, b) - threatScore(state, leaderId, a),
  );

  // Reserve 1 AP for propaganda at Chump.
  const propagandaReserve = chumpAlive && budget >= PROPAGANDA_COST ? PROPAGANDA_COST : 0;
  const offenceBudget = budget - propagandaReserve;

  // Launch first — salvo self-limits to ammo on hand; warmonger has no cap.
  const salvo = launchSalvo(state, leaderId, { budget: offenceBudget, rankedTargets });
  // Build with whatever the salvo left unspent.
  const build = buildToward(
    state, leaderId, NETANYAHOO_BUILD_PLAN, offenceBudget - salvo.apSpent,
  );
  budget -= salvo.apSpent + build.apSpent;

  // Builds must precede launches in the submitted array.
  const orders: Order[] = [...build.orders, ...salvo.orders];

  // Propaganda exclusively at Chump.
  if (chumpAlive && budget >= PROPAGANDA_COST) {
    const prop: Order = { kind: 'propaganda', target: 'chump' };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
    }
  }

  return orders;
}
