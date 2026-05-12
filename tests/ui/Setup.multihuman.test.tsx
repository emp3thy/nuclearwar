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

  it('Start button label reflects roster size', () => {
    const dispatch = vi.fn();
    render(<Setup state={initialUiState} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: /chump/i }));
    fireEvent.click(screen.getByRole('button', { name: /carnage/i }));
    expect(screen.getByRole('button', { name: /start.*1 human.*2 ai/i })).toBeInTheDocument();
  });
});
