import type { Difficulty, GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { nextRandom } from '../rng';
import { dispatch } from './dispatch';
import { bestTargetByLookahead } from './lookahead';

const DIFFICULTY_RANDOM_PCT: Record<Difficulty, number> = {
  easy: 0.3,
  normal: 0.1,
  hard: 0,
};

export function planAi(state: GameState, leaderId: LeaderId, difficulty?: Difficulty): Order[] {
  const diff = difficulty ?? state.difficulty;
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  // Get the per-leader baseline orders (personality-specific, difficulty-agnostic).
  let orders = dispatch(state, leaderId);

  // Hard mode: replace the target of any launch order with the lookahead-optimal target.
  // dispatch is used as the opponent planner so opponents never recurse into Hard.
  if (diff === 'hard') {
    const launchIndex = orders.findIndex((o) => o.kind === 'launch');
    if (launchIndex !== -1) {
      const launch = orders[launchIndex];
      if (launch.kind === 'launch') {
        const others = state.cast.filter((id) => id !== leaderId && state.leaders[id]?.alive);
        if (others.length > 0) {
          const baseline = orders.filter((_, i) => i !== launchIndex);
          const bestTarget = bestTargetByLookahead(
            state,
            leaderId,
            baseline,
            others,
            { delivery: launch.delivery, warhead: launch.warhead, targetType: launch.targetType },
            dispatch,
          );
          if (bestTarget !== null) {
            orders = [
              ...baseline.slice(0, launchIndex),
              { ...launch, target: bestTarget },
              ...baseline.slice(launchIndex),
            ];
          }
        }
      }
    }
  }

  // Easy / Normal randomization: replace each order with probability difficulty-pct.
  if (DIFFICULTY_RANDOM_PCT[diff] > 0) {
    orders = applyRandomization(state, leaderId, orders, DIFFICULTY_RANDOM_PCT[diff]);
  }

  return orders;
}

function applyRandomization(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
  pct: number,
): Order[] {
  let rngState = state.rngState;
  const me = state.leaders[leaderId];
  let remainingBudget = me.ap;
  const candidates: Order[] = [
    { kind: 'build-factory' },
    { kind: 'build-missile' },
    { kind: 'build-bomber' },
    { kind: 'build-warhead', yield: 'small' },
    { kind: 'build-warhead', yield: 'medium' },
    { kind: 'build-warhead', yield: 'large' },
    { kind: 'build-defence', type: 'shield' },
    { kind: 'build-defence', type: 'aa' },
  ];

  const out: Order[] = [];
  for (const o of orders) {
    const roll = nextRandom(rngState);
    rngState = roll.state;
    const cost = apCostOf(o);

    if (roll.value < pct) {
      // Replace with a random affordable, valid alternative.
      const affordable = candidates.filter((c) =>
        apCostOf(c) <= remainingBudget && validateOrder(state, leaderId, c).ok,
      );
      if (affordable.length === 0) {
        // Drop the order.
        remainingBudget -= 0;
        continue;
      }
      const pick = nextRandom(rngState);
      rngState = pick.state;
      const replacement = affordable[Math.floor(pick.value * affordable.length)];
      out.push(replacement);
      remainingBudget -= apCostOf(replacement);
    } else {
      if (cost <= remainingBudget) {
        out.push(o);
        remainingBudget -= cost;
      }
      // else: drop — a more expensive replacement upstream consumed budget that
      // this pass-through would have used. Better to drop this order than to
      // silently lose the entire turn at the reducer.
    }
  }

  // Note: this advances `state.rngState` in a "shadow" — the caller dispatches
  // the orders via the reducer and mutates state.rngState there. We don't write
  // back here. Difficulty randomization seeds itself from the read-only rngState,
  // which means two consecutive planAi calls on the same state produce the SAME
  // randomized output. This is intentional for replay determinism: the AI's
  // "random" decisions are bound to the round's seed.
  return out;
}
