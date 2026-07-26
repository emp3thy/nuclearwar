import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Winners from '../../src/ui/screens/Winners';
import { initialState } from '../../src/engine/state';
import type { NewGameOpts } from '../../src/engine/state';
import type { WinOutcome } from '../../src/engine/types';
import type { UiState } from '../../src/ui/store';

const OPTS: NewGameOpts = {
  cast: ['player1', 'chump', 'carnage'],
  difficulty: 'normal',
  seed: 'winners-render',
};

function makeState(outcome: WinOutcome): UiState {
  const game = initialState(OPTS);
  game.round = 8;
  game.outcome = outcome;
  // player1 wiped out (100%), chump battered (55%), carnage lightly grazed (20%).
  game.leaders.player1.population = 0;
  game.leaders.player1.alive = false;
  game.leaders.chump.population = 15;
  game.leaders.carnage.population = 20;
  return {
    screen: 'winners',
    game,
    events: [],
    prevPopulations: {},
    initialPopulations: { player1: 30, chump: 33, carnage: 25 },
    lastNewGameOpts: OPTS,
    pendingHumanOrders: {},
  };
}

describe('<Winners>', () => {
  it('renders the winner headline, final-score tag and survivor stamp', () => {
    render(<Winners state={makeState({ type: 'survivor', winner: 'carnage' })} dispatch={vi.fn()} />);
    expect(screen.getByText('CARNAGE WINS')).toBeInTheDocument();
    expect(screen.getByText('FINAL SCORE · ROUND 7')).toBeInTheDocument();
    expect(screen.getByText('SURVIVOR')).toBeInTheDocument();
    expect(screen.getByText('"EVERYBODY PLAYS. NOBODY WINS."')).toBeInTheDocument();
  });

  it('sorts death-toll rows ascending by percent lost, rounded to integers', () => {
    render(<Winners state={makeState({ type: 'survivor', winner: 'carnage' })} dispatch={vi.fn()} />);
    const pcts = screen.getAllByText(/^\d+%$/).map((el) => el.textContent);
    // carnage (25→20) 20%, chump (33→15) 54.5→55%, player1 (30→0) 100%.
    expect(pcts).toEqual(['20%', '55%', '100%']);
    expect(screen.getByText('Rufus T. Firefly (you)')).toBeInTheDocument();
  });

  it('badges end-zero rows ELIMINATED and the rest SURVIVED', () => {
    render(<Winners state={makeState({ type: 'survivor', winner: 'carnage' })} dispatch={vi.fn()} />);
    expect(screen.getAllByText('SURVIVED')).toHaveLength(2);
    expect(screen.getAllByText('ELIMINATED')).toHaveLength(1);
  });

  it('shows the NO SURVIVORS apocalypse panel instead of a portrait', () => {
    render(<Winners state={makeState({ type: 'apocalypse' })} dispatch={vi.fn()} />);
    expect(screen.getByText('WINNER: NOBODY')).toBeInTheDocument();
    expect(screen.getByText('NO SURVIVORS')).toBeInTheDocument();
    expect(screen.getByText('☢')).toBeInTheDocument();
  });

  it('gives the pyrrhic outcome an honest headline instead of a "WINS" lie', () => {
    render(<Winners state={makeState({ type: 'pyrrhic', winner: 'chump' })} dispatch={vi.fn()} />);
    expect(screen.getByText('LAST TO FALL: CHUMP')).toBeInTheDocument();
    expect(screen.queryByText('CHUMP WINS')).not.toBeInTheDocument();
    expect(screen.getAllByText('LAST TO FALL').length).toBeGreaterThan(0);
  });

  it('renders an Awards panel for the pyrrhic outcome from outcome data alone (sparse log)', () => {
    render(<Winners state={makeState({ type: 'pyrrhic', winner: 'chump' })} dispatch={vi.fn()} />);
    expect(screen.getByText('Honours (Dishonours)')).toBeInTheDocument();
  });

  it('renders an Awards panel with LAST ONE STANDING for the survivor outcome', () => {
    render(<Winners state={makeState({ type: 'survivor', winner: 'carnage' })} dispatch={vi.fn()} />);
    expect(screen.getByText('Honours (Dishonours)')).toBeInTheDocument();
    expect(screen.getByText('LAST ONE STANDING')).toBeInTheDocument();
  });

  it('omits the Awards panel when there are no awards (apocalypse, empty log)', () => {
    render(<Winners state={makeState({ type: 'apocalypse' })} dispatch={vi.fn()} />);
    expect(screen.queryByText('Honours (Dishonours)')).not.toBeInTheDocument();
  });

  it('shows the human epitaph line', () => {
    render(<Winners state={makeState({ type: 'survivor', winner: 'carnage' })} dispatch={vi.fn()} />);
    expect(screen.getByText(/Rufus T\. Firefly was eliminated/)).toBeInTheDocument();
  });

  it('New Game dispatches BACK_TO_SETUP', () => {
    const dispatch = vi.fn();
    render(<Winners state={makeState({ type: 'survivor', winner: 'carnage' })} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'BACK_TO_SETUP' });
  });

  it('Same Cast, Again dispatches START_GAME with the last opts and a fresh seed', () => {
    const dispatch = vi.fn();
    render(<Winners state={makeState({ type: 'survivor', winner: 'carnage' })} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Same Cast, Again' }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('START_GAME');
    expect(action.opts.cast).toEqual(OPTS.cast);
    expect(action.opts.difficulty).toBe(OPTS.difficulty);
    expect(action.opts.seed).not.toBe(OPTS.seed);
    expect(action.opts.seed.length).toBeGreaterThan(0);
  });
});
