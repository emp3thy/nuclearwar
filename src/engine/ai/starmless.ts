import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore, wasAttackedBy } from './scoring';
import { AI_SCORING_WEIGHTS } from '../balance';
import { nextRandom } from '../rng';

/**
 * Starmless — Cautious + Scapegoat personality.
 *
 * Behavioural rules:
 * 1. Defensive baseline: in non-retaliation rounds, prefer building factories
 *    (~60 % of build decisions are factories; warheads otherwise).
 * 2. Retaliation gate: triggered when wasAttackedBy(state, leaderId, any) === true.
 * 3. On retaliation, 35 % chance (starmlessScapegoatPct roll) to scapegoat —
 *    pick a target OTHER than the actual attacker, specifically the candidate with
 *    the highest aggregateThreat (sum of threatScore from all leaders toward them).
 * 4. Propaganda only at leaders who attacked Starmless (wasAttackedBy filter).
 */
export function planStarmless(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const orders: Order[] = [];
  let budget = me.ap;

  const LAUNCH_COST = 2;
  const PROPAGANDA_COST = 1;
  const FACTORY_COST = 3;

  // --- Living non-self leaders ---
  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);

  // --- Identify attackers ---
  const attackers = others.filter((t) => wasAttackedBy(state, leaderId, t));
  const isRetaliationRound = attackers.length > 0;

  // --- Determine launch target ---
  let launchTarget: LeaderId | undefined;

  if (isRetaliationRound && others.length > 0) {
    // Identify the primary attacker (highest recentAggressionFrom value, tie-break by grudge).
    let primaryAttacker: LeaderId = attackers[0];
    let bestAggression = me.recentAggressionFrom[primaryAttacker] ?? 0;
    for (const a of attackers) {
      const agg = me.recentAggressionFrom[a] ?? 0;
      if (agg > bestAggression) {
        bestAggression = agg;
        primaryAttacker = a;
      }
    }

    // Scapegoat roll: read rngState without advancing the shared state.
    const roll = nextRandom(state.rngState).value;
    const doScapegoat = roll < AI_SCORING_WEIGHTS.starmlessScapegoatPct;

    if (doScapegoat) {
      // Pick candidate with highest aggregate threat (sum of threatScore from all leaders toward them).
      // Candidates: alive, not self, NOT the primary attacker.
      const candidates = others.filter((t) => t !== primaryAttacker);
      if (candidates.length > 0) {
        function aggregateThreat(c: LeaderId): number {
          return state.cast.reduce(
            (sum, l) => sum + threatScore(state, l, c),
            0,
          );
        }
        launchTarget = candidates.reduce((best, t) =>
          aggregateThreat(t) >= aggregateThreat(best) ? t : best,
        );
      } else {
        // No other candidate — fall back to primary attacker.
        launchTarget = primaryAttacker;
      }
    } else {
      // Normal retaliation: target the primary attacker.
      launchTarget = primaryAttacker;
    }
  }

  const canLaunch =
    launchTarget !== undefined &&
    me.stockpile.missiles >= 1 &&
    me.stockpile.warheadsSmall >= 1 &&
    budget >= LAUNCH_COST;

  // --- Reserve AP: launch first, then propaganda at attackers ---
  const launchReserve = canLaunch ? LAUNCH_COST : 0;
  const propagandaSlots = Math.min(
    attackers.length,
    Math.max(0, budget - launchReserve),
  );
  const totalReserve = launchReserve + propagandaSlots * PROPAGANDA_COST;
  let buildBudget = budget - totalReserve;

  // --- 1. Build orders: factory bias in non-retaliation; warheads otherwise ---
  let remaining = buildBudget;

  if (!isRetaliationRound) {
    // Prefer factory (~60 % factory bias). Build factory if we can afford it,
    // then fill remainder with warheads.
    if (remaining >= FACTORY_COST) {
      const o: Order = { kind: 'build-factory' };
      if (validateOrder(state, leaderId, o).ok) {
        orders.push(o);
        remaining -= FACTORY_COST;
      }
    }
  }

  // Fill remaining build budget with small warheads.
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

  // --- 2. Launch if a target was chosen ---
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

  // --- 3. Propaganda only at attackers ---
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
