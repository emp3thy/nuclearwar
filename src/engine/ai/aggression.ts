import type { GameState, LeaderId, Order, Yield } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { warheadFieldFor } from '../launches';

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
