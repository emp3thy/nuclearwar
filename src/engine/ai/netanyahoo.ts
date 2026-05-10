import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore, wasAttackedBy } from './scoring';

/**
 * Netanyahoo — Warmonger personality.
 *
 * Behavioural rules:
 * 1. High base launch bias; always launches if stockpile allows.
 * 2. Chump-exception: no launch at Chump until Chump has attacked first
 *    (`wasAttackedBy(state, 'netanyahoo', 'chump') === true`).
 * 3. Propaganda exclusively at Chump (always, when Chump is alive and budget ≥ 1).
 * 4. Bias toward the largest-arsenal target (highest threatScore), excluding
 *    Chump unless the Chump-exception has been triggered.
 * 5. No woo of others; no woo of Chump in P2.
 */
export function planNetanyahoo(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const orders: Order[] = [];
  let budget = me.ap;

  const LAUNCH_COST = 2;
  const PROPAGANDA_COST = 1;

  // --- Living non-self leaders ---
  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);

  // --- Chump state ---
  const chumpAlive = state.cast.includes('chump') && state.leaders['chump']?.alive === true;
  const chumpProvoked = wasAttackedBy(state, leaderId, 'chump');

  // --- Candidates for launch (exclude Chump unless provoked) ---
  const launchCandidates = others.filter((t) => t !== 'chump' || chumpProvoked);

  // --- Pick the highest-threatScore candidate ---
  let launchTarget: LeaderId | undefined;
  if (launchCandidates.length > 0) {
    launchTarget = launchCandidates.reduce((best, t) =>
      threatScore(state, leaderId, t) >= threatScore(state, leaderId, best) ? t : best,
    );
  }

  // Determine whether a launch is feasible this round.
  const canLaunch =
    launchTarget !== undefined &&
    me.stockpile.missiles >= 1 &&
    me.stockpile.warheadsSmall >= 1 &&
    budget >= LAUNCH_COST;

  // --- Reserve AP: launch first, then propaganda ---
  const launchReserve = canLaunch ? LAUNCH_COST : 0;
  const propagandaReserve =
    chumpAlive && budget >= launchReserve + PROPAGANDA_COST ? PROPAGANDA_COST : 0;
  const buildBudget = budget - launchReserve - propagandaReserve;

  // --- 1. Builds: build missiles/warheads with leftover budget ---
  let remaining = buildBudget;

  // Build missiles (warmonger stockpile bias).
  while (remaining >= 1) {
    const o: Order = { kind: 'build-missile' };
    if (validateOrder(state, leaderId, o).ok) {
      orders.push(o);
      remaining -= 1;
    } else {
      break;
    }
  }

  // Build small warheads with whatever is left.
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

  // --- 2. Launch at the best candidate ---
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

  // --- 3. Propaganda exclusively at Chump ---
  if (chumpAlive && budget >= PROPAGANDA_COST) {
    const prop: Order = { kind: 'propaganda', target: 'chump' };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
    }
  }

  return orders;
}
