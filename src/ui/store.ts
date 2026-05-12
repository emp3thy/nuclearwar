import type { GameState, LeaderId, Order, ResolutionEvent } from '../engine/types';
import type { NewGameOpts } from '../engine/state';
import { initialState, isHuman } from '../engine/state';
import { reduce } from '../engine/reducer';
import { planAi } from '../engine/ai';
import { resolveRound } from '../engine/resolution';

export type ScreenName =
  | 'setup'
  | 'planning'
  | 'hotseat'
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
  /** Multi-human hotseat: which human is currently planning. Undefined in solo, between rounds, or once all humans have sealed. */
  activeHumanTurn?: LeaderId;
  /** Buffered orders from each human this round, drained into engine SUBMIT_ORDERS once the last human seals. */
  pendingHumanOrders: Partial<Record<LeaderId, Order[]>>;
}

export type UiAction =
  | { type: 'START_GAME'; opts: NewGameOpts }
  | { type: 'PLAYER_SUBMIT'; leaderId: LeaderId; orders: Order[] }
  | { type: 'BEGIN_PLANNING'; leaderId: LeaderId }
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
  pendingHumanOrders: {},
};

function nextHumanAfter(cast: LeaderId[], current: LeaderId): LeaderId | undefined {
  const humans = cast.filter(isHuman);
  const idx = humans.indexOf(current);
  if (idx === -1) return undefined;
  return humans[idx + 1];
}

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'START_GAME': {
      const game = initialState(action.opts);
      const initialPopulations: Partial<Record<LeaderId, number>> = {};
      for (const id of game.cast) initialPopulations[id] = game.leaders[id].population;
      const firstHuman = game.cast.find(isHuman);
      return {
        screen: 'planning',
        game,
        events: [],
        prevPopulations: {},
        initialPopulations,
        lastNewGameOpts: action.opts,
        activeHumanTurn: firstHuman,
        pendingHumanOrders: {},
      };
    }
    case 'PLAYER_SUBMIT': {
      if (!state.game) return state;
      const pendingHumanOrders = { ...state.pendingHumanOrders, [action.leaderId]: action.orders };
      const next = nextHumanAfter(state.game.cast, action.leaderId);
      if (next) {
        return { ...state, screen: 'hotseat', activeHumanTurn: next, pendingHumanOrders };
      }
      // All humans done — drain buffer into engine SUBMIT_ORDERS per human, then advance.
      let game = state.game;
      for (const [leaderId, orders] of Object.entries(pendingHumanOrders) as [LeaderId, Order[]][]) {
        game = reduce(game, { type: 'SUBMIT_ORDERS', leaderId, orders });
      }
      return {
        ...state,
        screen: 'aiConferring',
        game,
        activeHumanTurn: undefined,
        pendingHumanOrders: {},
      };
    }
    case 'BEGIN_PLANNING': {
      return { ...state, screen: 'planning', activeHumanTurn: action.leaderId };
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
      if (state.game.outcome) return { ...state, screen: 'winners' };
      const firstHuman = state.game.cast.find(isHuman);
      return { ...state, screen: 'planning', activeHumanTurn: firstHuman };
    }
    case 'BACK_TO_SETUP':
      return initialUiState;
  }
}
