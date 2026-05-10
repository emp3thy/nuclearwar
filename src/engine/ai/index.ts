import type { Difficulty, GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { nextRandom } from '../rng';
import { planChump } from './chump';
import { planCarnage } from './carnage';
import { planKhameneverhere } from './khameneverhere';
import { planNetanyahoo } from './netanyahoo';
import { planStarmless } from './starmless';
import { planMileighHem } from './mileighhem';

const DIFFICULTY_RANDOM_PCT: Record<Difficulty, number> = {
  easy: 0.3,
  normal: 0.1,
  hard: 0,
};

export function planAi(state: GameState, leaderId: LeaderId, difficulty?: Difficulty): Order[] {
  const diff = difficulty ?? state.difficulty;
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  // Hard-mode lookahead is implemented inside per-leader files via
  // bestTargetByLookahead (see Task 11). The dispatcher itself just routes by
  // leaderId and applies the Easy/Normal randomization wrapper.
  let orders = dispatch(state, leaderId);

  // Easy / Normal randomization: replace each order with probability difficulty-pct.
  if (DIFFICULTY_RANDOM_PCT[diff] > 0) {
    orders = applyRandomization(state, leaderId, orders, DIFFICULTY_RANDOM_PCT[diff]);
  }

  return orders;
}

function dispatch(state: GameState, leaderId: LeaderId): Order[] {
  switch (leaderId) {
    case 'chump': return planChump(state, leaderId);
    case 'carnage': return planCarnage(state, leaderId);
    case 'khameneverhere': return planKhameneverhere(state, leaderId);
    case 'netanyahoo': return planNetanyahoo(state, leaderId);
    case 'starmless': return planStarmless(state, leaderId);
    case 'mileigh-hem': return planMileighHem(state, leaderId);
  }
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
      out.push(o);
      remainingBudget -= cost;
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
