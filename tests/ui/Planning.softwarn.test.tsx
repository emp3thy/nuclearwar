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
    // Click the + button on the Sm Warhead cell in BuildGrid.
    // player1 starts with 0 missiles + 0 bombers, so queuing a warhead
    // triggers the warhead-no-delivery soft warning.
    const smWarheadLabel = screen.getByText(/Sm Warhead/i);
    const cell = smWarheadLabel.closest('[class*="cell"]') as HTMLElement;
    const buttons = cell.querySelectorAll('button');
    // stepper layout: [−] count [+]; + is the last button
    const plusBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    fireEvent.click(plusBtn);
    expect(screen.getByText(/suggestions/i)).toBeInTheDocument();
    expect(screen.getByText(/no delivery/i)).toBeInTheDocument();
  });
});
