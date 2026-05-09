import type { Action, GameState } from './types';
import { initialState } from './state';
import { totalApCost, validateOrder } from './orders';
import { resolveRound } from './resolution';

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return initialState({
        cast: action.cast,
        difficulty: action.difficulty,
        seed: action.seed,
        config: action.config,
      });

    case 'SUBMIT_ORDERS': {
      const me = state.leaders[action.leaderId];
      if (!me || !me.alive) return state;
      for (const o of action.orders) {
        const v = validateOrder(state, action.leaderId, o);
        if (!v.ok) return state;
      }
      const cost = totalApCost(action.orders);
      if (cost > me.ap) return state;

      const next = structuredClone(state);
      next.leaders[action.leaderId].ap = me.ap - cost;
      next.pendingOrders[action.leaderId] = {
        leaderId: action.leaderId,
        orders: action.orders,
        apSpent: cost,
      };
      return next;
    }

    case 'RESOLVE_ROUND':
      return resolveRound(state).state;

    case 'LOAD_STATE':
      return action.state;
  }
}
