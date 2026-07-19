import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Planning from '../../src/ui/screens/Planning';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeState(): UiState {
  const game = initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'planning-test',
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

describe('<Planning> action-card grid', () => {
  it('renders build grid with Factory cell', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText('Factory')).toBeInTheDocument();
  });

  it('renders defence grid with Build Shield cell', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText('Build Shield')).toBeInTheDocument();
  });

  it('renders target rows for each opponent', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByLabelText(/Target row for Chump/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target row for Carnage/i)).toBeInTheDocument();
  });

  it('renders the AP meter and orders subtotal', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText('SUBTOTAL')).toBeInTheDocument();
    expect(screen.getByText(/will bank/)).toBeInTheDocument();
  });

  it('seal button exists', () => {
    const dispatch = vi.fn();
    render(<Planning state={makeState()} dispatch={dispatch} />);
    expect(screen.getByRole('button', { name: /seal orders/i })).toBeInTheDocument();
  });
});
