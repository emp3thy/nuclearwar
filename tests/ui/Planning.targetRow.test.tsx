import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Planning from '../../src/ui/screens/Planning';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

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
    const wooBtn = screen.getByRole('button', { name: /Woo/i });
    fireEvent.click(wooBtn);
    // After click, the button should have the diploOn class
    expect(wooBtn.className).toMatch(/diploOn|on/i);
  });
});
