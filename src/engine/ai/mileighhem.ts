import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { wasAttackedBy } from './scoring';
import { AI_SCORING_WEIGHTS } from '../balance';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Mileigh-hem — Glass cannon personality (P4c.2 rework).
 *
 * Two modes gated by the activation trigger (apBanked + ap >= threshold).
 *
 * Activated: launch-first SPREAD salvo (cycles targets), then build a cheap
 * fast offensive stockpile with the remainder. No defence — glass cannon.
 *
 * Diplomatic (not activated): up to 2 woo + up to 2 propaganda at attackers.
 */
const MILEIGH_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 4 },
  { build: { item: 'warhead', yield: 'small' }, target: 3 },
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
];

export function planMileighHem(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);
  const attackers = others.filter((t) => wasAttackedBy(state, leaderId, t));

  const totalAp = me.apBanked + me.ap;
  const activated = totalAp >= AI_SCORING_WEIGHTS.mileighActivationApThreshold;

  if (activated) {
    // All-out mode: spread salvo first, then build with the remainder.
    const rankedTargets = attackers.length > 0 ? attackers : others;
    const salvo = launchSalvo(state, leaderId, {
      budget: me.ap,
      rankedTargets,
      spread: true,
    });
    const build = buildToward(state, leaderId, MILEIGH_BUILD_PLAN, me.ap - salvo.apSpent);
    return [...build.orders, ...salvo.orders];
  }

  // --- Diplomatic mode (unchanged from P4b) ---
  const orders: Order[] = [];
  let budget = me.ap;
  const WOO_COST = 1;
  const PROPAGANDA_COST = 1;

  const wooPool = attackers.length > 0 ? attackers : others;
  let wooCount = 0;
  for (const t of wooPool) {
    if (wooCount >= 2) break;
    if (budget < WOO_COST) break;
    const woo: Order = { kind: 'woo', target: t };
    if (validateOrder(state, leaderId, woo).ok) {
      orders.push(woo);
      budget -= apCostOf(woo);
      wooCount++;
    }
  }

  let propCount = 0;
  for (const t of attackers) {
    if (propCount >= 2) break;
    if (budget < PROPAGANDA_COST) break;
    const prop: Order = { kind: 'propaganda', target: t };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
      propCount++;
    }
  }

  return orders;
}
