import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Action, { buildPlaybackSteps } from '../../src/ui/screens/Action';
import { formatEventText } from '../../src/ui/util/eventText';
import { initialState } from '../../src/engine/state';
import { initialUiState, uiReducer } from '../../src/ui/store';
import type { UiState } from '../../src/ui/store';
import type { ResolutionEvent } from '../../src/engine/types';

const EVENTS: ResolutionEvent[] = [
  { kind: 'DefenceDeployed', by: 'chump', type: 'shield' },
  { kind: 'FactoryBuilt', by: 'carnage' },
  { kind: 'MissileLaunched', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'large', targetType: 'people', attackerQuote: 'Bye bye.' },
  { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'large', deaths: 5, targetQuote: 'Rude.' },
];

function makeState(events: ResolutionEvent[] = EVENTS, outcome = false): UiState {
  const game = initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'action-playback-test',
  });
  game.round = 2;  // resolution has already incremented the round
  if (outcome) game.outcome = { type: 'survivor', winner: 'chump' };
  return {
    screen: 'action',
    game,
    events,
    prevPopulations: {},
    initialPopulations: {},
    lastNewGameOpts: null,
    pendingHumanOrders: {},
  };
}

describe('<Action> playback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the step-0 banner, phase tag, and counter', () => {
    const { container } = render(<Action state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText('NOW DEFENCE')).toBeInTheDocument();
    expect(container.textContent).toContain('🇺🇸 Chump deploys a shield');
    expect(screen.getByText('Event 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('ACTION')).toBeInTheDocument();
  });

  it('renders the banner from a real resolved game state', () => {
    const before: UiState = {
      ...initialUiState,
      screen: 'aiConferring',
      game: initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'real-resolve' }),
    };
    const ui = uiReducer(before, { type: 'AI_RESOLVE' });
    const steps = buildPlaybackSteps(ui.events);
    expect(steps.length).toBeGreaterThan(0);
    const first = formatEventText(steps[0].event, ui.game!, steps[0].count);
    expect(first).not.toBeNull();
    const { container } = render(<Action state={ui} dispatch={vi.fn()} />);
    expect(container.textContent).toContain(first!.body);
  });

  it('auto-advances after 2700ms, and after 1100ms in fast mode', () => {
    const { container } = render(<Action state={makeState()} dispatch={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(2699);
    });
    expect(container.textContent).toContain('deploys a shield');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(container.textContent).toContain('builds 1 factory');
    // Fast mode: next dwell is 1100ms.
    fireEvent.click(screen.getByText('⏭ FAST 3×'));
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByText('NOW LAUNCHES')).toBeInTheDocument();
    expect(container.textContent).toContain('🇺🇸 → 🇨🇦 (large · people)');
  });

  it('halts while paused and resumes on RESUME', () => {
    const { container } = render(<Action state={makeState()} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByText('⏸ PAUSE'));
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(container.textContent).toContain('deploys a shield');
    fireEvent.click(screen.getByText('▶ RESUME'));
    act(() => {
      vi.advanceTimersByTime(2700);
    });
    expect(container.textContent).toContain('builds 1 factory');
  });

  it('disables PREV at step 0; NEXT steps forward and PREV back', () => {
    const { container } = render(<Action state={makeState()} dispatch={vi.fn()} />);
    const prev = screen.getByText('← PREV');
    expect(prev).toBeDisabled();
    fireEvent.click(screen.getByText('NEXT →'));
    expect(container.textContent).toContain('builds 1 factory');
    expect(screen.getByText('Event 2 of 4')).toBeInTheDocument();
    expect(prev).not.toBeDisabled();
    fireEvent.click(prev);
    expect(container.textContent).toContain('deploys a shield');
  });

  it('shows TO THE NEWS → on the last step and dispatches ACTION_DONE on click', () => {
    const dispatch = vi.fn();
    render(<Action state={makeState()} dispatch={dispatch} />);
    fireEvent.click(screen.getByText('NEXT →'));
    fireEvent.click(screen.getByText('NEXT →'));
    fireEvent.click(screen.getByText('NEXT →'));
    const done = screen.getByText('TO THE NEWS →');
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(done);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'ACTION_DONE' });
  });

  it('SKIP → dispatches ACTION_DONE from mid-playback', () => {
    const dispatch = vi.fn();
    render(<Action state={makeState()} dispatch={dispatch} />);
    fireEvent.click(screen.getByText('SKIP →'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'ACTION_DONE' });
  });

  it('labels the last-step exit TO THE VERDICT → when the game has an outcome', () => {
    render(<Action state={makeState(EVENTS, true)} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByText('NEXT →'));
    fireEvent.click(screen.getByText('NEXT →'));
    fireEvent.click(screen.getByText('NEXT →'));
    expect(screen.getByText('TO THE VERDICT →')).toBeInTheDocument();
  });

  it('shows the quiet-round copy and only a continue button when there are no steps', () => {
    const dispatch = vi.fn();
    render(<Action state={makeState([])} dispatch={dispatch} />);
    expect(screen.getByText('An eerily quiet round. Nobody did anything.')).toBeInTheDocument();
    expect(screen.queryByText('← PREV')).not.toBeInTheDocument();
    expect(screen.queryByText(/Event \d+ of/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('TO THE NEWS →'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'ACTION_DONE' });
  });

  it('renders actor and receiver name pills over the map', () => {
    render(<Action state={makeState()} dispatch={vi.fn()} />);
    // Step 0 (DefenceDeployed): actor only.
    expect(screen.getByText('CHUMP')).toBeInTheDocument();
    expect(screen.queryByText('CARNAGE')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('NEXT →'));
    fireEvent.click(screen.getByText('NEXT →'));
    // Step 2 (MissileLaunched): actor + receiver + attacker quote bubble.
    expect(screen.getByText('CHUMP')).toBeInTheDocument();
    expect(screen.getByText('CARNAGE')).toBeInTheDocument();
    expect(screen.getAllByText('Bye bye.').length).toBeGreaterThan(0);
  });

  it('shows burst + damage badge on a damaging impact', () => {
    render(<Action state={makeState()} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByText('NEXT →'));
    fireEvent.click(screen.getByText('NEXT →'));
    fireEvent.click(screen.getByText('NEXT →'));
    expect(screen.getByText('BOOM!')).toBeInTheDocument();
    expect(screen.getByText('−5')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('suppresses both burst and badge on a zero-damage impact', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactInfrastructure', from: 'chump', target: 'carnage', warhead: 'small', factoriesDestroyed: 0 },
    ];
    render(<Action state={makeState(events)} dispatch={vi.fn()} />);
    expect(screen.queryByText('WHAM!')).not.toBeInTheDocument();
    expect(screen.queryByText('FACT')).not.toBeInTheDocument();
    expect(screen.queryByText('−0')).not.toBeInTheDocument();
    // The step itself still plays (banner + receiver highlight).
    expect(screen.getByText('NOW LAUNCHES')).toBeInTheDocument();
  });

  it('renders the FACT badge for infrastructure damage', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactInfrastructure', from: 'chump', target: 'carnage', warhead: 'small', factoriesDestroyed: 2 },
    ];
    render(<Action state={makeState(events)} dispatch={vi.fn()} />);
    expect(screen.getByText('WHAM!')).toBeInTheDocument();
    expect(screen.getByText('−2')).toBeInTheDocument();
    expect(screen.getByText('FACT')).toBeInTheDocument();
  });

  it('renders the Disparage cameo card on the step its impact matches', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'large', deaths: 5 },
      { kind: 'DisparageCameo', afterImpact: { from: 'chump', to: 'carnage' }, quote: 'Pint?' },
    ];
    render(<Action state={makeState(events)} dispatch={vi.fn()} />);
    expect(screen.getByText('Event 1 of 1')).toBeInTheDocument();
    expect(screen.getByText('🍺 FROM CLACTON')).toBeInTheDocument();
    expect(screen.getByText('Pint?')).toBeInTheDocument();
  });

  it('stamps ELIMINATED across the receiver portrait on LeaderEliminated', () => {
    const events: ResolutionEvent[] = [
      { kind: 'LeaderEliminated', id: 'carnage', quote: 'Elbows down.' },
    ];
    render(<Action state={makeState(events)} dispatch={vi.fn()} />);
    expect(screen.getByText('ELIMINATED')).toBeInTheDocument();
    expect(screen.getByText('CARNAGE')).toBeInTheDocument();
  });
});
