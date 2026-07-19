import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HotseatHandoff from '../../src/ui/screens/HotseatHandoff';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeState(): UiState {
  const game = initialState({
    cast: ['player1', 'player2', 'chump'],
    difficulty: 'normal',
    seed: 'hotseat-test',
    config: {
      playerProfiles: {
        player2: { name: 'Bob', country: '🐢 Sylvania' },
      },
    },
  });
  return {
    screen: 'hotseat',
    game,
    events: [],
    prevPopulations: {},
    initialPopulations: {},
    lastNewGameOpts: null,
    activeHumanTurn: 'player2',
    pendingHumanOrders: { player1: [] },
  };
}

describe('<HotseatHandoff>', () => {
  it('renders PASS TO, the next leader\'s name, and their country flag', () => {
    render(<HotseatHandoff state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText('PASS TO')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('🐢')).toBeInTheDocument();
    expect(screen.getByText(/previous orders sealed/i)).toBeInTheDocument();
  });

  it('BEGIN MY TURN dispatches BEGIN_PLANNING with the active human', () => {
    const dispatch = vi.fn();
    render(<HotseatHandoff state={makeState()} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: /begin my turn/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'BEGIN_PLANNING', leaderId: 'player2' });
  });
});
