import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { defenceVisibilityScore, opportunismScore } from './scoring';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Chump — Coward personality (P4c.2 rework).
 *
 * Defensive, but opportunistic: launches at weak / undefended targets under a
 * low cap. Never launches at a leader who has wooed Chump. Heavy defence build
 * + deploy and propaganda preserved. Prefers infra targeting when the target
 * still has factories to lose.
 */
const PROPAGANDA_COST = 1;
const DEPLOY_COST = 4;
const CHUMP_MAX_LAUNCHES = 2;

// Warheads come before the second shield refill so the shield-deploy cycle
// cannot starve warhead production. Missile is first to ensure a delivery
// vehicle is always available (a plan with warheads but no delivery would
// recreate the zero-fire bug).
const CHUMP_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 2 },
  { build: { item: 'warhead', yield: 'small' }, target: 4 },
  { build: { item: 'defence', type: 'shield' }, target: 3 },
];

export function planChump(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);

  // Eligible launch targets: not protected by Chump's own favourability toward
  // them (a leader who wooed Chump raises me.favourability[t] > 0).
  const eligible = others.filter((t) => (me.favourability[t] ?? 0) <= 0);
  // Weak targets: low defence OR otherwise vulnerable. Ranked weakest-first.
  const weakTargets = eligible
    .filter((t) => opportunismScore(state, t) > 0 || defenceVisibilityScore(state, t) === 0)
    .sort((a, b) => opportunismScore(state, b) - opportunismScore(state, a));

  // Infra targeting when the target still has factories to lose.
  const targetTypeFor = (t: LeaderId): 'people' | 'infra' =>
    state.leaders[t].factories > 2 ? 'infra' : 'people';

  // Reserve 1 AP for propaganda.
  const propagandaReserve = others.length > 0 && budget >= 1 ? PROPAGANDA_COST : 0;
  const offenceBudget = budget - propagandaReserve;

  // Launch first (low cap), then build with the remainder.
  const salvo = launchSalvo(state, leaderId, {
    budget: offenceBudget,
    rankedTargets: weakTargets,
    maxLaunches: CHUMP_MAX_LAUNCHES,
    targetTypeFor,
  });
  const build = buildToward(
    state, leaderId, CHUMP_BUILD_PLAN, offenceBudget - salvo.apSpent,
  );
  budget -= salvo.apSpent + build.apSpent;

  const orders: Order[] = [...build.orders, ...salvo.orders];

  // Deploy a shield if one is in stock and AP allows.
  if (me.stockpile.shields >= 1 && budget >= DEPLOY_COST) {
    const deploy: Order = { kind: 'deploy-defence', type: 'shield' };
    if (validateOrder(state, leaderId, deploy).ok) {
      orders.push(deploy);
      budget -= DEPLOY_COST;
    }
  }

  // Propaganda — broadcast to the first available target.
  if (budget >= PROPAGANDA_COST && others.length > 0) {
    const prop: Order = { kind: 'propaganda', target: others[0] };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
    }
  }

  return orders;
}
