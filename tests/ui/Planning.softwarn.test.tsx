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
  it('always renders the panel; empty state shows the fallback copy', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText('SOFT WARNINGS')).toBeInTheDocument();
    expect(screen.getByText(/nothing obviously stupid\. yet\./i)).toBeInTheDocument();
  });

  it('shows the warning after adding a warhead with no delivery owned', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    // player1 starts with 0 missiles + 0 bombers, so queuing a warhead
    // triggers the warhead-no-delivery soft warning.
    fireEvent.click(screen.getByRole('button', { name: 'add Sm Warhead' }));
    expect(screen.getByText(/no delivery/i)).toBeInTheDocument();
    expect(screen.queryByText(/nothing obviously stupid/i)).not.toBeInTheDocument();
  });
});
