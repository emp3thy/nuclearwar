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
  it('renders the next leader\'s country and name', () => {
    render(<HotseatHandoff state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText(/Sylvania/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByText(/previous orders sealed/i)).toBeInTheDocument();
  });

  it('tap dispatches BEGIN_PLANNING with the active human', () => {
    const dispatch = vi.fn();
    render(<HotseatHandoff state={makeState()} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: /tap to begin/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'BEGIN_PLANNING', leaderId: 'player2' });
  });
});
