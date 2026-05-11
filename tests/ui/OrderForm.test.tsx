import { render, screen, fireEvent } from '@testing-library/react';
import OrderForm from '../../src/ui/components/OrderForm';
import { initialState } from '../../src/engine/state';
import type { GameState, Order } from '../../src/engine/types';

function gameWithCast(): GameState {
  return initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'order-form-test',
  });
}

describe('<OrderForm>', () => {
  it('blocks Add for a launch without delivery + warhead', () => {
    const state = gameWithCast();
    let added: Order | null = null;
    render(
      <OrderForm
        state={state}
        playerId="player1"
        committedOrders={[]}
        onAdd={(o) => { added = o; }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/order kind/i), { target: { value: 'launch' } });
    fireEvent.change(screen.getByLabelText(/target/i), { target: { value: 'chump' } });
    // delivery + warhead not set — should be invalid
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(added).toBeNull();
    expect(screen.getByText(/missing.*delivery|missing.*warhead/i)).toBeInTheDocument();
  });

  it('surfaces engine validateOrder reason on AP overrun', () => {
    const state = gameWithCast();
    // player starts with ap=3; queue a build-warhead-large (cost 3); a second cost-3 order overruns
    const prior: Order[] = [{ kind: 'build-warhead', yield: 'large' }];
    let added: Order | null = null;
    render(
      <OrderForm
        state={state}
        playerId="player1"
        committedOrders={prior}
        onAdd={(o) => { added = o; }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/order kind/i), { target: { value: 'build-factory' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(added).toBeNull();
    expect(screen.getByText(/budget|overrun|ap/i)).toBeInTheDocument();
  });

  it('accepts a valid build-factory order', () => {
    const state = gameWithCast();
    let added: Order | null = null;
    render(
      <OrderForm
        state={state}
        playerId="player1"
        committedOrders={[]}
        onAdd={(o) => { added = o; }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/order kind/i), { target: { value: 'build-factory' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(added).toEqual({ kind: 'build-factory' });
  });
});
