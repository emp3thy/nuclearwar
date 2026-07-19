import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore, wasAttackedBy } from './scoring';
import { AI_SCORING_WEIGHTS } from '../balance';
import { nextRandom } from '../rng';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Burn'em — Cautious + Scapegoat personality (P4c.2 rework).
 *
 * Defensive baseline, but with a new kill instinct: launches when retaliating
 * OR when a finishable (low-population) opponent exists. Low launch cap — he
 * still builds factories and defence. Scapegoat roll preserved on retaliation.
 */
const PROPAGANDA_COST = 1;
const DEPLOY_COST = 4;
const BURNEM_FINISH_POP_M = 8;
const BURNEM_MAX_LAUNCHES = 2;

// Factory target 7 (starts at 6) so at most one factory is built per low-AP
// round — leaving budget for the missile + warhead stock the kill instinct
// needs. A plan with warheads but NO delivery vehicle would recreate the
// zero-fire bug, so the missile entry is mandatory.
const BURNEM_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'factory' }, target: 7 },
  { build: { item: 'missile' }, target: 2 },
  { build: { item: 'warhead', yield: 'small' }, target: 3 },
  { build: { item: 'defence', type: 'shield' }, target: 2 },
];

export function planBurnem(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);
  const attackers = others.filter((t) => wasAttackedBy(state, leaderId, t));
  const isRetaliationRound = attackers.length > 0;

  // --- Determine launch target ---
  let launchTarget: LeaderId | undefined;

  if (isRetaliationRound) {
    // Primary attacker = highest recentAggressionFrom.
    let primaryAttacker: LeaderId = attackers[0];
    let bestAggression = me.recentAggressionFrom[primaryAttacker] ?? 0;
    for (const a of attackers) {
      const agg = me.recentAggressionFrom[a] ?? 0;
      if (agg > bestAggression) {
        bestAggression = agg;
        primaryAttacker = a;
      }
    }
    // Scapegoat roll (reads rngState without advancing shared state).
    const roll = nextRandom(state.rngState).value;
    const doScapegoat = roll < AI_SCORING_WEIGHTS.burnemScapegoatPct;
    if (doScapegoat) {
      const candidates = others.filter((t) => t !== primaryAttacker);
      if (candidates.length > 0) {
        const aggregateThreat = (c: LeaderId): number =>
          state.cast.reduce((sum, l) => sum + threatScore(state, l, c), 0);
        launchTarget = candidates.reduce((best, t) =>
          aggregateThreat(t) >= aggregateThreat(best) ? t : best,
        );
      } else {
        launchTarget = primaryAttacker;
      }
    } else {
      launchTarget = primaryAttacker;
    }
  } else {
    // New P4c.2 kill instinct: finish off a low-population opponent.
    const finishable = others
      .filter((t) => state.leaders[t].population <= BURNEM_FINISH_POP_M)
      .sort((a, b) => state.leaders[a].population - state.leaders[b].population);
    if (finishable.length > 0) launchTarget = finishable[0];
  }

  const rankedTargets = launchTarget !== undefined ? [launchTarget] : [];

  // Reserve 1 AP per attacker for propaganda.
  const propagandaReserve = Math.min(attackers.length, Math.max(0, budget - 2));
  const offenceBudget = budget - propagandaReserve;

  // Launch first (low cap), then build with the remainder.
  const salvo = launchSalvo(state, leaderId, {
    budget: offenceBudget,
    rankedTargets,
    maxLaunches: BURNEM_MAX_LAUNCHES,
  });
  const build = buildToward(
    state, leaderId, BURNEM_BUILD_PLAN, offenceBudget - salvo.apSpent,
  );
  budget -= salvo.apSpent + build.apSpent;

  const orders: Order[] = [...build.orders, ...salvo.orders];

  // Deploy a shield if one is in stock and AP allows (deploy = commit).
  if (me.stockpile.shields >= 1 && budget >= DEPLOY_COST) {
    const deploy: Order = { kind: 'deploy-defence', type: 'shield' };
    if (validateOrder(state, leaderId, deploy).ok) {
      orders.push(deploy);
      budget -= DEPLOY_COST;
    }
  }

  // Propaganda only at attackers.
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
