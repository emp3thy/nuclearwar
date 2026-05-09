import type { Action, GameState } from './types';
import { initialState } from './state';
import { totalApCost, validateOrder } from './orders';
import { resolveRound } from './resolution';
import { warheadFieldFor } from './launches';

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

      // Validate each order against a projected state so that successive launch
      // orders see the running stockpile after prior orders' consumption.
      // Non-launch orders don't consume launch stock; only launch orders need to
      // decrement the projection.
      let projected: GameState = state;
      for (const o of action.orders) {
        const v = validateOrder(projected, action.leaderId, o);
        if (!v.ok) return state;
        if (o.kind === 'launch') {
          projected = structuredClone(projected);
          const pl = projected.leaders[action.leaderId];
          if (o.delivery === 'missile') pl.stockpile.missiles -= 1;
          else pl.stockpile.bombers -= 1;
          pl.stockpile[warheadFieldFor(o.warhead)] -= 1;
        }
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
