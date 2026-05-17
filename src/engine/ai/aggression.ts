import type { GameState, LeaderId, Order, Yield } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { warheadFieldFor } from '../launches';
import { ACTION_COSTS } from '../balance';

// --- buildToward ---------------------------------------------------------

export type BuildItem =
  | { item: 'factory' }
  | { item: 'missile' }
  | { item: 'bomber' }
  | { item: 'warhead'; yield: Yield }
  | { item: 'defence'; type: 'shield' | 'aa' };

export interface BuildPlanEntry {
  build: BuildItem;
  /** Build up to this many TOTAL (current stockpile + queued by this call). */
  target: number;
}

export interface BuildResult {
  orders: Order[];
  apSpent: number;
}

function buildOrderFor(b: BuildItem): Order {
  switch (b.item) {
    case 'factory': return { kind: 'build-factory' };
    case 'missile': return { kind: 'build-missile' };
    case 'bomber': return { kind: 'build-bomber' };
    case 'warhead': return { kind: 'build-warhead', yield: b.yield };
    case 'defence': return { kind: 'build-defence', type: b.type };
  }
}

function currentCount(state: GameState, leaderId: LeaderId, b: BuildItem): number {
  const me = state.leaders[leaderId];
  switch (b.item) {
    case 'factory': return me.factories;
    case 'missile': return me.stockpile.missiles;
    case 'bomber': return me.stockpile.bombers;
    case 'warhead': return me.stockpile[warheadFieldFor(b.yield)];
    case 'defence': return b.type === 'shield' ? me.stockpile.shields : me.stockpile.aa;
  }
}

/**
 * Walk an ordered, capped build plan. For each entry, emit build orders until
 * the leader's count of that item (current stockpile + orders queued by this
 * call) reaches `target`, the budget cannot afford the item, or validation
 * fails. The cap makes an unbounded build loop inexpressible.
 */
export function buildToward(
  state: GameState,
  leaderId: LeaderId,
  plan: BuildPlanEntry[],
  budget: number,
): BuildResult {
  const orders: Order[] = [];
  let remaining = budget;
  for (const entry of plan) {
    const order = buildOrderFor(entry.build);
    const cost = apCostOf(order);
    const baseCount = currentCount(state, leaderId, entry.build);
    let queued = 0;
    while (
      baseCount + queued < entry.target &&
      remaining >= cost &&
      // validateOrder currently always returns ok for build orders while the
      // leader is alive; it is kept here as a forward-compatible guard so
      // buildToward automatically respects any future build-validation rule
      // (and to halt cleanly if ever called for a dead leader).
      validateOrder(state, leaderId, order).ok
    ) {
      orders.push(order);
      queued++;
      remaining -= cost;
    }
  }
  return { orders, apSpent: budget - remaining };
}

// --- launchSalvo ---------------------------------------------------------

export interface LaunchSalvoOpts {
  /** AP available for launches this round. */
  budget: number;
  /** Targets ranked best-first. Each must be alive and non-self. */
  rankedTargets: LeaderId[];
  /** Hard cap on launches emitted. Omit to fire until AP/ammo run out. */
  maxLaunches?: number;
  /** false (default) = focus-fire rankedTargets[0]; true = cycle targets. */
  spread?: boolean;
  /** Per-target targetType selector. Default: () => 'people'. */
  targetTypeFor?: (target: LeaderId) => 'people' | 'infra';
}

export interface SalvoResult {
  orders: Order[];
  apSpent: number;
}

const YIELD_ORDER: Yield[] = ['large', 'medium', 'small'];

/**
 * Pair available delivery vehicles with warheads, largest-yield-first, and
 * emit launch orders until budget, ammo, or maxLaunches runs out. A projected
 * stockpile is tracked internally so the salvo never over-commits.
 */
export function launchSalvo(
  state: GameState,
  leaderId: LeaderId,
  opts: LaunchSalvoOpts,
): SalvoResult {
  const me = state.leaders[leaderId];
  const orders: Order[] = [];
  if (!me || opts.rankedTargets.length === 0) return { orders, apSpent: 0 };

  let remaining = opts.budget;
  let bombers = me.stockpile.bombers;
  let missiles = me.stockpile.missiles;
  const warheads: Record<Yield, number> = {
    large: me.stockpile.warheadsLarge,
    medium: me.stockpile.warheadsMedium,
    small: me.stockpile.warheadsSmall,
  };
  const targetTypeFor = opts.targetTypeFor ?? ((): 'people' => 'people');

  let launched = 0;
  while (true) {
    if (opts.maxLaunches !== undefined && launched >= opts.maxLaunches) break;
    if (remaining < ACTION_COSTS.launch) break;
    if (bombers + missiles < 1) break;
    const y = YIELD_ORDER.find((yy) => warheads[yy] > 0);
    if (y === undefined) break;

    const delivery: 'bomber' | 'missile' = bombers >= 1 ? 'bomber' : 'missile';
    const target = opts.spread
      ? opts.rankedTargets[launched % opts.rankedTargets.length]
      : opts.rankedTargets[0];
    const launch: Order = {
      kind: 'launch',
      target,
      delivery,
      warhead: y,
      targetType: targetTypeFor(target),
    };
    if (!validateOrder(state, leaderId, launch).ok) break;

    orders.push(launch);
    remaining -= ACTION_COSTS.launch;
    warheads[y] -= 1;
    if (delivery === 'bomber') bombers -= 1;
    else missiles -= 1;
    launched += 1;
  }
  return { orders, apSpent: opts.budget - remaining };
}
