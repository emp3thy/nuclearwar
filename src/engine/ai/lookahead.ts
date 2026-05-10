import type { DeliveryType, GameState, LeaderId, Order, TargetType, Yield } from '../types';
import { reduce } from '../reducer';
import { planAi } from './index';

export interface LookaheadLaunchSpec {
  delivery: DeliveryType;
  warhead: Yield;
  targetType: TargetType;
}

/**
 * Run one round forward with the supplied per-leader orders. Caller-supplied
 * orders for `viewer`-leaders override; missing leaders default to empty
 * order list. The function does NOT mutate input state.
 *
 * Used by Hard-mode lookahead: try a candidate move, see what happens, score.
 */
export function simulateOneRound(
  state: GameState,
  ordersByLeader: Partial<Record<LeaderId, Order[]>>,
): GameState {
  let s = state;
  for (const id of state.cast) {
    const orders = ordersByLeader[id] ?? [];
    const next = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    if (next === s) {
      // Order set was rejected (e.g., AP overrun). Fall back to empty orders so
      // the simulation still progresses; AI personalities may pass orders that
      // exceed budget when constructing speculative candidates.
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders: [] });
    } else {
      s = next;
    }
  }
  s = reduce(s, { type: 'RESOLVE_ROUND' });
  return s;
}

/**
 * Score a state from `viewer`'s perspective. Higher is better for `viewer`.
 *
 *   - Outcome with viewer winning → +1000
 *   - Outcome with anyone else winning → −1000
 *   - Apocalypse (no winner) → −500 (better than losing, worse than surviving)
 *   - All opponents dead, viewer alive → +1000 (effective win)
 *   - Otherwise: viewer.population − max(other living leader's population)
 */
export function scoreState(state: GameState, viewer: LeaderId): number {
  if (state.outcome) {
    if (state.outcome.type === 'apocalypse') return -500;
    if (state.outcome.winner === viewer) return 1000;
    return -1000;
  }
  const me = state.leaders[viewer];
  if (!me) return -1000;
  const others = state.cast
    .filter((id) => id !== viewer)
    .map((id) => state.leaders[id])
    .filter((l) => l && l.alive);
  if (others.length === 0) return 1000; // we're the only one alive — effectively win
  const maxOther = Math.max(...others.map((o) => o!.population));
  return me.population - maxOther;
}

/**
 * Pick the candidate launch target whose projected post-round state scores
 * highest from `viewer`'s perspective. Opponents are simulated at NORMAL
 * difficulty (no recursion into Hard).
 *
 * `baseline` are non-launch orders (builds, propaganda, etc.) the viewer is
 * already committed to this round; `launch` describes the launch shape that
 * gets re-targeted across candidates.
 *
 * Returns `null` if `candidates` is empty.
 */
export function bestTargetByLookahead(
  state: GameState,
  viewer: LeaderId,
  baseline: Order[],
  candidates: readonly LeaderId[],
  launch: LookaheadLaunchSpec,
): LeaderId | null {
  if (candidates.length === 0) return null;

  let best: LeaderId | null = null;
  let bestScore = -Infinity;

  for (const target of candidates) {
    const selfOrders: Order[] = [
      ...baseline,
      { kind: 'launch', target, ...launch },
    ];
    const ordersByLeader: Partial<Record<LeaderId, Order[]>> = {
      [viewer]: selfOrders,
    };
    for (const id of state.cast) {
      if (id === viewer) continue;
      const opp = state.leaders[id];
      if (!opp || !opp.alive) continue;
      // Force NORMAL difficulty for opponent simulation to avoid Hard→Hard recursion.
      ordersByLeader[id] = planAi(state, id, 'normal');
    }
    const projected = simulateOneRound(state, ordersByLeader);
    const score = scoreState(projected, viewer);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }

  return best;
}
