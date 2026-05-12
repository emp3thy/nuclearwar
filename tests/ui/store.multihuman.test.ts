import { describe, expect, it } from 'vitest';
import { uiReducer, initialUiState } from '../../src/ui/store';
import type { UiState } from '../../src/ui/store';

function bootedTwoHumans(): UiState {
  return uiReducer(initialUiState, {
    type: 'START_GAME',
    opts: {
      cast: ['player1', 'player2', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'multi-human-test',
      config: {
        playerProfiles: {
          player1: { name: 'Alice', country: '🦆 Freedonia' },
          player2: { name: 'Bob', country: '🐢 Sylvania' },
        },
      },
    },
  });
}

describe('store multi-human routing', () => {
  it('START_GAME with 2 humans goes to planning with player1 as activeHumanTurn', () => {
    const s = bootedTwoHumans();
    expect(s.screen).toBe('planning');
    expect(s.activeHumanTurn).toBe('player1');
    expect(s.pendingHumanOrders).toEqual({});
  });

  it('PLAYER_SUBMIT for H1 buffers and routes to hotseat with H2 active', () => {
    let s = bootedTwoHumans();
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player1', orders: [] });
    expect(s.screen).toBe('hotseat');
    expect(s.activeHumanTurn).toBe('player2');
    expect(s.pendingHumanOrders.player1).toEqual([]);
  });

  it('BEGIN_PLANNING from hotseat returns to planning with the active human', () => {
    let s = bootedTwoHumans();
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player1', orders: [] });
    s = uiReducer(s, { type: 'BEGIN_PLANNING', leaderId: 'player2' });
    expect(s.screen).toBe('planning');
    expect(s.activeHumanTurn).toBe('player2');
  });

  it('PLAYER_SUBMIT for last human drains buffer and routes to aiConferring', () => {
    let s = bootedTwoHumans();
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player1', orders: [] });
    s = uiReducer(s, { type: 'BEGIN_PLANNING', leaderId: 'player2' });
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player2', orders: [] });
    expect(s.screen).toBe('aiConferring');
    expect(s.activeHumanTurn).toBeUndefined();
    expect(s.pendingHumanOrders).toEqual({});
  });

  it('solo (1 human) skips hotseat — PLAYER_SUBMIT routes directly to aiConferring', () => {
    let s = uiReducer(initialUiState, {
      type: 'START_GAME',
      opts: {
        cast: ['player1', 'chump', 'carnage'],
        difficulty: 'normal',
        seed: 'solo-test',
      },
    });
    expect(s.activeHumanTurn).toBe('player1');
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player1', orders: [] });
    expect(s.screen).toBe('aiConferring');
  });
});
