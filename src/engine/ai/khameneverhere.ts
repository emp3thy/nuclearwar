import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { topGrudgeTarget } from './scoring';

/**
 * Khameneverhere — Grudge personality.
 *
 * Behavioural rules:
 * 1. Each round, launch focus on the leader at the top of the grudge list.
 * 2. Fallback when grudge empty: pick the first living non-self leader.
 * 3. Build a moderate stockpile (target ~3 missiles + 3 small warheads).
 *    Not heavy on defences — offence over defence.
 * 4. Does not woo or propagandise much; launch-focused.
 */
export function planKhameneverhere(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const orders: Order[] = [];
  let budget = me.ap;

  const MISSILE_TARGET = 3;
  const WARHEAD_TARGET = 3;
  const LAUNCH_COST = 2;
  const BUILD_MISSILE_COST = 1;
  const BUILD_WARHEAD_COST = 1;

  // Count pending builds already in orders (to avoid double-counting).
  const pendingMissiles = () => orders.filter((o) => o.kind === 'build-missile').length;
  const pendingWarheads = () =>
    orders.filter((o) => o.kind === 'build-warhead' && (o as Extract<Order, { kind: 'build-warhead' }>).yield === 'small').length;

  // Determine whether a launch will be possible this round (missiles + warheads already in stock).
  // Reserve LAUNCH_COST AP so the build loop doesn't crowd it out.
  const canLaunchNow = me.stockpile.missiles >= 1 && me.stockpile.warheadsSmall >= 1;
  const launchReserve = canLaunchNow ? LAUNCH_COST : 0;
  let buildBudget = budget - launchReserve;

  // --- 1. Build missiles up to target stockpile ---
  while (
    buildBudget >= BUILD_MISSILE_COST &&
    me.stockpile.missiles + pendingMissiles() < MISSILE_TARGET
  ) {
    const o: Order = { kind: 'build-missile' };
    if (validateOrder(state, leaderId, o).ok) {
      orders.push(o);
      buildBudget -= BUILD_MISSILE_COST;
    } else {
      break;
    }
  }

  // --- 2. Build small warheads up to target ---
  while (
    buildBudget >= BUILD_WARHEAD_COST &&
    me.stockpile.warheadsSmall + pendingWarheads() < WARHEAD_TARGET
  ) {
    const o: Order = { kind: 'build-warhead', yield: 'small' };
    if (validateOrder(state, leaderId, o).ok) {
      orders.push(o);
      buildBudget -= BUILD_WARHEAD_COST;
    } else {
      break;
    }
  }

  budget -= (budget - launchReserve) - buildBudget; // consume what was actually spent on builds

  // --- 3. Launch at the top grudge target (fallback: first living non-self leader) ---
  if (me.stockpile.missiles >= 1 && me.stockpile.warheadsSmall >= 1 && budget >= LAUNCH_COST) {
    const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);
    const top =
      topGrudgeTarget(state, leaderId) ?? others[0];
    if (top !== undefined) {
      const launch: Order = {
        kind: 'launch',
        target: top,
        delivery: 'missile',
        warhead: 'small',
        targetType: 'people',
      };
      if (validateOrder(state, leaderId, launch).ok) {
        orders.push(launch);
        budget -= apCostOf(launch);
      }
    }
  }

  return orders;
}
