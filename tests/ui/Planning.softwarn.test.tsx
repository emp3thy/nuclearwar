import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Planning from '../../src/ui/screens/Planning';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeState(): UiState {
  const game = initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'softwarn-planning-test',
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

describe('<Planning> soft-warn panel', () => {
  it('hides the panel when no warnings', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.queryByText(/suggestions/i)).not.toBeInTheDocument();
  });

  it('shows the panel after adding a warhead with no delivery owned', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/order kind/i), { target: { value: 'build-warhead' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getByText(/suggestions/i)).toBeInTheDocument();
    expect(screen.getByText(/no delivery/i)).toBeInTheDocument();
  });
});
