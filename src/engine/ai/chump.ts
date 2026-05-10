import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { defenceVisibilityScore, opportunismScore } from './scoring';

/**
 * Chump — Coward personality.
 *
 * Behavioural rules:
 * 1. High build-defence + build-warhead bias.
 * 2. Launch when target's defence is low (defenceVisibilityScore === 0) OR target
 *    is otherwise weak (opportunismScore > 0), BUT only if budget allows after
 *    reserving AP for propaganda.
 * 3. Wooing-suppression: never launch at a leader who has wooed Chump
 *    (me.favourability[t] > 0).
 * 4. Prefers Infra targeting (when target has factories > 2); only targets
 *    People when target can't rebuild.
 * 5. Heavy propagandist: emits propaganda when AP allows.
 */
export function planChump(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const orders: Order[] = [];
  let budget = me.ap;

  const LAUNCH_COST = 2;
  const PROPAGANDA_COST = 1;

  // --- Identify the other living leaders ---
  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t].alive);

  // --- Find a weak, unwooed target for a potential launch ---
  const eligible = others.filter((t) => (me.favourability[t] ?? 0) <= 0);
  const weakTarget = eligible.find(
    (t) => opportunismScore(state, t) > 0 || defenceVisibilityScore(state, t) === 0,
  );

  const canLaunch =
    weakTarget !== undefined &&
    me.stockpile.missiles >= 1 &&
    me.stockpile.warheadsSmall >= 1 &&
    budget >= LAUNCH_COST;

  // Reserve AP for launch (if feasible) and for propaganda.
  const launchReserve = canLaunch ? LAUNCH_COST : 0;
  const propagandaReserve = others.length > 0 && budget >= launchReserve + PROPAGANDA_COST
    ? PROPAGANDA_COST
    : 0;
  const buildBudget = budget - launchReserve - propagandaReserve;

  // --- 1. Build orders: defence first, then warheads ---
  let remaining = buildBudget;

  // Build shields as long as budget allows (bias toward defence).
  const defenceCost = 2;
  while (remaining >= defenceCost) {
    const o: Order = { kind: 'build-defence', type: 'shield' };
    if (validateOrder(state, leaderId, o).ok) {
      orders.push(o);
      remaining -= defenceCost;
    } else {
      break;
    }
  }

  // Build small warheads with leftover build budget.
  const warheadCost = 1;
  while (remaining >= warheadCost) {
    const o: Order = { kind: 'build-warhead', yield: 'small' };
    if (validateOrder(state, leaderId, o).ok) {
      orders.push(o);
      remaining -= warheadCost;
    } else {
      break;
    }
  }

  budget -= buildBudget - remaining; // consume what was actually spent on builds

  // --- 2. Launch if conditions are met ---
  if (canLaunch && weakTarget !== undefined && budget >= LAUNCH_COST) {
    const t = state.leaders[weakTarget];
    const targetType: 'infra' | 'people' = t.factories > 2 ? 'infra' : 'people';
    const launch: Order = {
      kind: 'launch',
      target: weakTarget,
      delivery: 'missile',
      warhead: 'small',
      targetType,
    };
    if (validateOrder(state, leaderId, launch).ok) {
      orders.push(launch);
      budget -= apCostOf(launch);
    }
  }

  // --- 3. Propaganda — broadcast to first available target ---
  if (budget >= PROPAGANDA_COST && others.length > 0) {
    const propTarget = others[0];
    const propOrder: Order = { kind: 'propaganda', target: propTarget };
    if (validateOrder(state, leaderId, propOrder).ok) {
      orders.push(propOrder);
      budget -= apCostOf(propOrder);
    }
  }

  return orders;
}
