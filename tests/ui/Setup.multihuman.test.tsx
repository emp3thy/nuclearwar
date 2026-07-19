import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Setup from '../../src/ui/screens/Setup';
import { initialUiState } from '../../src/ui/store';

describe('<Setup> multi-human roster', () => {
  it('renders one human card (P1) by default', () => {
    render(<Setup state={initialUiState} dispatch={vi.fn()} />);
    expect(screen.getAllByRole('textbox', { name: /name/i })).toHaveLength(1);
  });

  it('+ Add appends humans up to 5', () => {
    render(<Setup state={initialUiState} dispatch={vi.fn()} />);
    const addBtn = screen.getByRole('button', { name: /add another human/i });
    for (let i = 0; i < 4; i++) fireEvent.click(addBtn);
    expect(screen.getAllByRole('textbox', { name: /name/i })).toHaveLength(5);
    expect(addBtn).toBeDisabled();
  });

  it('× removes a non-P1 human card', () => {
    render(<Setup state={initialUiState} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /add another human/i }));
    expect(screen.getAllByRole('textbox', { name: /name/i })).toHaveLength(2);
    const removes = screen.getAllByRole('button', { name: /remove/i });
    expect(removes).toHaveLength(1);
    fireEvent.click(removes[0]);
    expect(screen.getAllByRole('textbox', { name: /name/i })).toHaveLength(1);
  });

  it('Begin button gates on 2+ opponents and shows the live count', () => {
    const dispatch = vi.fn();
    render(<Setup state={initialUiState} dispatch={dispatch} />);
    const begin = screen.getByRole('button', { name: /begin the end/i });
    expect(begin).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /chump/i }));
    fireEvent.click(screen.getByRole('button', { name: /carnage/i }));
    expect(begin).toBeEnabled();
    expect(screen.getByTestId('opponent-count')).toHaveTextContent('2/4');
    fireEvent.click(begin);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'START_GAME' }),
    );
  });

  it('picking a 5th opponent drops the oldest pick', () => {
    render(<Setup state={initialUiState} dispatch={vi.fn()} />);
    for (const name of [/chump/i, /carnage/i, /starmless/i, /netanyahoo/i]) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    fireEvent.click(screen.getByRole('button', { name: /khameneverhere/i }));
    // chump (oldest) dropped; the four later picks remain
    expect(screen.getByRole('button', { name: /chump/i })).toHaveAttribute('aria-pressed', 'false');
    for (const name of [/carnage/i, /starmless/i, /netanyahoo/i, /khameneverhere/i]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    }
  });
});
