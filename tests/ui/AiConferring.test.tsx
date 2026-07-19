import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import AiConferring from '../../src/ui/screens/AiConferring';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeState(): UiState {
  const game = initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'conferring-test',
  });
  return {
    screen: 'aiConferring',
    game,
    events: [],
    prevPopulations: {},
    initialPopulations: {},
    lastNewGameOpts: null,
    pendingHumanOrders: {},
  };
}

describe('<AiConferring>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders one row per living AI leader with the live name and flavour line', () => {
    render(<AiConferring state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText(/is on the phone yelling at his generals/)).toBeInTheDocument();
    expect(screen.getByText(/polishes his glasses/)).toBeInTheDocument();
    // Humans get no row (player1's flavour text never appears).
    expect(screen.queryByText(/Rufus/)).not.toBeInTheDocument();
  });

  it('flips rows to FILED in cast order at staggered times', () => {
    render(<AiConferring state={makeState()} dispatch={vi.fn()} />);
    // Two AI leaders → flips at 1200ms and 2400ms.
    expect(screen.queryAllByText('FILED ✓')).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getAllByText('FILED ✓')).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getAllByText('FILED ✓')).toHaveLength(2);
  });

  it('dispatches AI_RESOLVE exactly once at 2900ms', () => {
    const dispatch = vi.fn();
    render(<AiConferring state={makeState()} dispatch={dispatch} />);
    act(() => {
      vi.advanceTimersByTime(2899);
    });
    expect(dispatch).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'AI_RESOLVE' });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('unmount clears timers — no dispatch after unmount', () => {
    const dispatch = vi.fn();
    const { unmount } = render(<AiConferring state={makeState()} dispatch={dispatch} />);
    unmount();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
