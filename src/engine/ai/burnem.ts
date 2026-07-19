import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore } from './scoring';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Burn'em — the Handbrake Turn (spec 2026-07-19 §2).
 *
 * Placid by default: woos, holds at his starting factory count, banks AP,
 * never launches first. The first landed hit on him (persistent grudge > 0)
 * flips him permanently into full aggression against the provoker. Patience
 * fallback (round >= 3 unprovoked, or 2 survivors) prevents the
 * never-attack-first 1v1 stall (cf. Netanyahoo endgame fix).
 *
 * Duel-balance note: an unthrottled version of this planner (max launches 4,
 * placid factory target 8, patience round 6) let Burn'em dominate the
 * 80-seed AI-duel sweep (46/80 wins) — he sat out early fights, compounded
 * AP via a growing factory count (see resolution.ts's `factoryAp` term) while
 * placid, then pounced on already-weakened survivors. A shorter patience
 * fallback (attack sooner, before rivals have worn each other down) turned
 * out to be the dominant lever; the lower launch cap and flat factory target
 * trim the follow-through so he does not simply re-dominate once aggressive.
 */
const DEPLOY_COST = 4;
const BURNEM_PATIENCE_ROUND = 3;
const BURNEM_MAX_LAUNCHES = 2;

const PLACID_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'factory' }, target: 6 },
  { build: { item: 'defence', type: 'shield' }, target: 2 },
];

// Missile before warheads: delivery-first avoids the armed-but-undeliverable
// zero-fire failure.
const PROVOKED_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 3 },
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
  { build: { item: 'warhead', yield: 'small' }, target: 2 },
  { build: { item: 'factory' }, target: 7 },
];

export function planBurnem(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;
  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);

  // --- Provocation: any surviving leader who ever landed a hit (grudge persists). ---
  const provokers = others.filter((t) => (me.grudge[t] ?? 0) > 0);
  let target: LeaderId | undefined;
  if (provokers.length > 0) {
    target = provokers.reduce((best, t) =>
      (me.grudge[t] ?? 0) > (me.grudge[best] ?? 0) ? t : best,
    );
  } else if (Object.values(me.grudge).some((g) => (g ?? 0) > 0)) {
    // Provoker(s) dead: stay provoked, redirect to the strongest survivor.
    target = pickStrongestRival(state, leaderId, others);
  } else if (state.round >= BURNEM_PATIENCE_ROUND || others.length === 1) {
    // Patience fallback — deadlock guard.
    target = pickStrongestRival(state, leaderId, others);
  }

  const orders: Order[] = [];

  if (target !== undefined) {
    // --- Provoked: handbrake off. ---
    const build = buildToward(state, leaderId, PROVOKED_BUILD_PLAN, budget);
    const salvo = launchSalvo(state, leaderId, {
      budget: budget - build.apSpent,
      rankedTargets: [target],
      maxLaunches: BURNEM_MAX_LAUNCHES,
    });
    budget -= build.apSpent + salvo.apSpent;
    // Producers precede consumers in the emitted batch.
    orders.push(...build.orders, ...salvo.orders);
  } else {
    // --- Placid: friendliest man in the apocalypse. ---
    const wooTarget = others.length > 0
      ? others.reduce((best, t) =>
          (me.favourability[t] ?? 0) < (me.favourability[best] ?? 0) ? t : best,
        )
      : undefined;
    if (wooTarget !== undefined) {
      const woo: Order = { kind: 'woo', target: wooTarget };
      if (budget >= apCostOf(woo) && validateOrder(state, leaderId, woo).ok) {
        orders.push(woo);
        budget -= apCostOf(woo);
      }
    }
    const build = buildToward(state, leaderId, PLACID_BUILD_PLAN, budget);
    budget -= build.apSpent;
    orders.push(...build.orders);
    if (me.stockpile.shields >= 1 && budget >= DEPLOY_COST) {
      const deploy: Order = { kind: 'deploy-defence', type: 'shield' };
      if (validateOrder(state, leaderId, deploy).ok) {
        orders.push(deploy);
        budget -= DEPLOY_COST;
      }
    }
    // Remaining AP banks implicitly.
  }

  return orders;
}

function pickStrongestRival(
  state: GameState, viewer: LeaderId, others: LeaderId[],
): LeaderId | undefined {
  if (others.length === 0) return undefined;
  return others.reduce((best, t) =>
    threatScore(state, viewer, t) > threatScore(state, viewer, best) ? t : best,
  );
}
