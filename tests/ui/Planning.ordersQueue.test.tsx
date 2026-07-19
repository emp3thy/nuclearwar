import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Planning from '../../src/ui/screens/Planning';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeState(): UiState {
  const game = initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'orders-queue-test',
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

describe('<Planning> orders queue', () => {
  it('shows the banking empty state when no orders are queued', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText(/No orders yet\. Banking is fine\. \(Cap 4\.\)/)).toBeInTheDocument();
  });

  it('queuing via a stepper shows a row with the label and AP cost', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'add Factory' }));

    const label = screen.getByText('Build factory');
    expect(label).toBeInTheDocument();
    const row = label.closest('div') as HTMLElement;
    expect(within(row).getByText('3 AP')).toBeInTheDocument();
    expect(screen.queryByText(/No orders yet/)).not.toBeInTheDocument();
  });

  it('× removes exactly that order and the subtotal updates', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'add Factory' })); // 3 AP
    fireEvent.click(screen.getByRole('button', { name: 'add Missile' })); // 1 AP

    const subtotal = screen.getByText('SUBTOTAL').parentElement as HTMLElement;
    expect(subtotal).toHaveTextContent('4 / 6 AP');

    const factoryRow = screen.getByText('Build factory').closest('div') as HTMLElement;
    fireEvent.click(within(factoryRow).getByRole('button', { name: 'remove' }));

    expect(screen.queryByText('Build factory')).not.toBeInTheDocument();
    expect(screen.getByText('Build missile')).toBeInTheDocument();
    expect(subtotal).toHaveTextContent('1 / 6 AP');
  });

  it('removing the last order restores the empty state', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'add Missile' }));
    const row = screen.getByText('Build missile').closest('div') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'remove' }));
    expect(screen.getByText(/No orders yet/)).toBeInTheDocument();
  });
});
