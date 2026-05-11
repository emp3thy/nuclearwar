import type { GameState, LeaderId, Order, ResolutionEvent } from '../engine/types';
import type { NewGameOpts } from '../engine/state';
import { initialState, isHuman } from '../engine/state';
import { reduce } from '../engine/reducer';
import { planAi } from '../engine/ai';
import { resolveRound } from '../engine/resolution';

export type ScreenName =
  | 'setup'
  | 'planning'
  | 'aiConferring'
  | 'action'
  | 'roundSummary'
  | 'winners';

export interface UiState {
  screen: ScreenName;
  game: GameState | null;
  events: ResolutionEvent[];
  prevPopulations: Partial<Record<LeaderId, number>>;
  initialPopulations: Partial<Record<LeaderId, number>>;
  lastNewGameOpts: NewGameOpts | null;
}

export type UiAction =
  | { type: 'START_GAME'; opts: NewGameOpts }
  | { type: 'PLAYER_SUBMIT'; orders: Order[] }
  | { type: 'AI_RESOLVE' }
  | { type: 'ACTION_DONE' }
  | { type: 'NEXT_ROUND' }
  | { type: 'BACK_TO_SETUP' };

export const initialUiState: UiState = {
  screen: 'setup',
  game: null,
  events: [],
  prevPopulations: {},
  initialPopulations: {},
  lastNewGameOpts: null,
};

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'START_GAME': {
      const game = initialState(action.opts);
      const initialPopulations: Partial<Record<LeaderId, number>> = {};
      for (const id of game.cast) initialPopulations[id] = game.leaders[id].population;
      return {
        screen: 'planning',
        game,
        events: [],
        prevPopulations: {},
        initialPopulations,
        lastNewGameOpts: action.opts,
      };
    }
    case 'PLAYER_SUBMIT': {
      if (!state.game) return state;
      const game = reduce(state.game, {
        type: 'SUBMIT_ORDERS',
        leaderId: 'player1',
        orders: action.orders,
      });
      return { ...state, screen: 'aiConferring', game };
    }
    case 'AI_RESOLVE': {
      if (!state.game) return state;
      const prevPopulations: Partial<Record<LeaderId, number>> = {};
      for (const id of state.game.cast) prevPopulations[id] = state.game.leaders[id].population;
      let game = state.game;
      for (const id of game.cast) {
        if (isHuman(id)) continue;
        if (!game.leaders[id].alive) continue;
        const orders = planAi(game, id);
        game = reduce(game, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
      }
      const result = resolveRound(game);
      return {
        ...state,
        screen: 'action',
        game: result.state,
        events: result.events,
        prevPopulations,
      };
    }
    case 'ACTION_DONE': {
      if (!state.game) return state;
      const next: ScreenName = state.game.outcome ? 'winners' : 'roundSummary';
      return { ...state, screen: next };
    }
    case 'NEXT_ROUND': {
      if (!state.game) return state;
      const next: ScreenName = state.game.outcome ? 'winners' : 'planning';
      return { ...state, screen: next };
    }
    case 'BACK_TO_SETUP':
      return initialUiState;
  }
}
