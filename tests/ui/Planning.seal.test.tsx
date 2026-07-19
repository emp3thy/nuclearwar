import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Planning from '../../src/ui/screens/Planning';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeState(): UiState {
  const game = initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'seal-test',
  });
  return {
    screen: 'planning',
    game,
    events: [],
    prevPopulations: {},
    initialPopulations: {},
    lastNewGameOpts: null,
    activeHumanTurn: 'player1',
    pendingHumanOrders: {},
  };
}

describe('<Planning> seal orders (hold)', () => {
  it('holding the seal button dispatches PLAYER_SUBMIT with the queued orders', async () => {
    const dispatch = vi.fn();
    render(<Planning state={makeState()} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'add Missile' }));

    fireEvent.mouseDown(screen.getByRole('button', { name: /seal orders/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1), { timeout: 3000 });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'PLAYER_SUBMIT',
      leaderId: 'player1',
      orders: [{ kind: 'build-missile' }],
    });
  });

  it('sealing with zero orders stays legal (banking)', async () => {
    const dispatch = vi.fn();
    render(<Planning state={makeState()} dispatch={dispatch} />);

    fireEvent.mouseDown(screen.getByRole('button', { name: /seal orders/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1), { timeout: 3000 });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'PLAYER_SUBMIT',
      leaderId: 'player1',
      orders: [],
    });
  });

  it('while over budget the seal button is disabled and the hold cannot complete', async () => {
    const dispatch = vi.fn();
    const state = makeState();
    const { rerender } = render(<Planning state={state} dispatch={dispatch} />);

    // Queue a 3 AP factory, then collapse the AP budget under it and re-render:
    // the queued orders (component state) now exceed player.ap.
    fireEvent.click(screen.getByRole('button', { name: 'add Factory' }));
    state.game!.leaders.player1.ap = 1;
    rerender(<Planning state={state} dispatch={dispatch} />);

    expect(screen.getByText(/Over budget by 2/)).toBeInTheDocument();
    const seal = screen.getByRole('button', { name: /seal orders/i });
    expect(seal).toBeDisabled();

    fireEvent.mouseDown(seal);
    await new Promise((r) => setTimeout(r, 900));
    expect(dispatch).not.toHaveBeenCalled();
  });
});
