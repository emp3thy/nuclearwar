import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RoundSummary from '../../src/ui/screens/RoundSummary';
import { CORRECTIONS } from '../../src/ui/util/newspaper';
import { initialState } from '../../src/engine/state';
import type { ResolutionEvent } from '../../src/engine/types';
import type { UiState } from '../../src/ui/store';

/** Post-resolution state: round already incremented to 2, paper reports round 1. */
function makeState(events: ResolutionEvent[] = [], round = 2): UiState {
  const game = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'summary-render',
  });
  game.round = round;
  game.leaders.player1.population = 30;
  game.leaders.chump.population = 27;
  return {
    screen: 'roundSummary',
    game,
    events,
    prevPopulations: { player1: 30, chump: 33 },
    initialPopulations: { player1: 30, chump: 40 },
    lastNewGameOpts: null,
    pendingHumanOrders: {},
  };
}

describe('<RoundSummary> tabloid', () => {
  it('renders the masthead from game.mastheadOrder for the reported round', () => {
    const state = makeState();
    // reportedRound = 1 → mastheadOrder[0]
    render(<RoundSummary state={state} dispatch={vi.fn()} />);
    expect(screen.getByText(state.game!.mastheadOrder[0])).toBeInTheDocument();
    expect(screen.getByText('EXTRA · EXTRA · EXTRA')).toBeInTheDocument();
    expect(screen.getByText('VOL. IV · ROUND 1')).toBeInTheDocument();
  });

  it('shows casualty-strip values from live populations', () => {
    render(<RoundSummary state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText('THIS ROUND')).toBeInTheDocument();
    // thisRoundLost = 33 − 27 = 6 → appears in the strip plus the headline
    // and photo stamps (both render −6M as well).
    expect(screen.getAllByText('−6M')).toHaveLength(3);
    // warTotalLost = 40 − 27 = 13
    expect(screen.getByText('−13M')).toBeInTheDocument();
    // survivors population = 30 + 27
    expect(screen.getByText('57M')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('rotates the corrections line with the reported round', () => {
    const first = render(<RoundSummary state={makeState([], 2)} dispatch={vi.fn()} />);
    expect(screen.getByText(CORRECTIONS[0])).toBeInTheDocument();
    first.unmount();
    render(<RoundSummary state={makeState([], 3)} dispatch={vi.fn()} />);
    expect(screen.getByText(CORRECTIONS[1])).toBeInTheDocument();
  });

  it('renders the story section head and one story per living leader', () => {
    render(<RoundSummary state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText('★ FROM AROUND THE RUBBLE ★')).toBeInTheDocument();
    // chump lost 6M → shrugs-off headline; player1 idle → does-nothing headline.
    expect(screen.getByText('CHUMP SHRUGS OFF LIGHT VAPORISATION')).toBeInTheDocument();
    expect(screen.getByText('RUFUS T. FIREFLY DOES NOTHING, CALLS IT STRATEGY')).toBeInTheDocument();
  });

  it('omits the Disparage column when no DisparageColumn event exists', () => {
    render(<RoundSummary state={makeState()} dispatch={vi.fn()} />);
    expect(screen.queryByText('THE DISPARAGE COLUMN')).not.toBeInTheDocument();
  });

  it('renders the Disparage column from the event when present', () => {
    const events: ResolutionEvent[] = [
      { kind: 'DisparageColumn', quote: 'Pint?', footer: 'Unavailable for follow-up.' },
    ];
    render(<RoundSummary state={makeState(events)} dispatch={vi.fn()} />);
    expect(screen.getByText('THE DISPARAGE COLUMN')).toBeInTheDocument();
    expect(screen.getByText('Pint?')).toBeInTheDocument();
    expect(screen.getByText('Unavailable for follow-up.')).toBeInTheDocument();
  });

  it('renders the box-score empty state when nothing qualifies', () => {
    render(<RoundSummary state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText('No exchanges. The censors are baffled.')).toBeInTheDocument();
  });

  it('dispatches NEXT_ROUND from the continue button with the preserved label', () => {
    const dispatch = vi.fn();
    render(<RoundSummary state={makeState()} dispatch={dispatch} />);
    const btn = screen.getByRole('button', { name: 'Round 2 → Plan' });
    fireEvent.click(btn);
    expect(dispatch).toHaveBeenCalledWith({ type: 'NEXT_ROUND' });
  });
});
