import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Planning from '../../src/ui/screens/Planning';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';
import type { Order } from '../../src/engine/types';

function makeStateWithMood(): UiState {
  const game = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'target-row-test',
  });
  game.leaders.player1.ap = 10;
  return {
    screen: 'planning',
    game,
    events: [
      { kind: 'PreRoundMood', leaderId: 'chump', quote: 'Many people are saying.', snapBack: false },
    ],
    prevPopulations: {},
    initialPopulations: {},
    lastNewGameOpts: null,
    activeHumanTurn: 'player1',
    pendingHumanOrders: {},
  };
}

describe('<TargetRow>', () => {
  it('renders mood quote when PreRoundMood event present for that leader', () => {
    render(<Planning state={makeStateWithMood()} dispatch={vi.fn()} />);
    expect(screen.getByText(/Many people are saying/)).toBeInTheDocument();
  });

  it('woo button toggles when clicked', () => {
    render(<Planning state={makeStateWithMood()} dispatch={vi.fn()} />);
    const wooBtn = screen.getByRole('button', { name: /woo/i });
    expect(wooBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(wooBtn);
    expect(wooBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(wooBtn);
    expect(wooBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('retargets queued launches when the target type is toggled to infra', async () => {
    const game = initialState({ cast: ['player1', 'chump'], difficulty: 'normal', seed: 'tt-toggle' });
    game.leaders.player1.ap = 10;
    game.leaders.player1.stockpile.missiles = 2;
    game.leaders.player1.stockpile.warheadsSmall = 2;
    const state: UiState = {
      screen: 'planning',
      game,
      events: [],
      prevPopulations: {},
      initialPopulations: {},
      lastNewGameOpts: null,
      activeHumanTurn: 'player1',
      pendingHumanOrders: {},
    };
    const dispatch = vi.fn();
    render(<Planning state={state} dispatch={dispatch} />);

    const row = screen.getByLabelText(/Target row for/i);
    // Queue a launch — defaults to people targeting.
    fireEvent.click(within(row).getAllByText('+')[0]);
    // Toggle the target to infra.
    fireEvent.click(within(row).getByText('infra'));
    // Seal orders (hold-to-confirm).
    fireEvent.mouseDown(screen.getByRole('button', { name: /seal orders/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1), { timeout: 3000 });

    const orders = dispatch.mock.calls[0][0].orders as Order[];
    const launches = orders.filter((o) => o.kind === 'launch');
    expect(launches).toHaveLength(1);
    expect(launches[0].kind === 'launch' && launches[0].targetType).toBe('infra');
  });
});
