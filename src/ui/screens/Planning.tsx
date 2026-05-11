import type { ScreenProps } from '../App';

export default function Planning({ state, dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Planning (stub) — Round {state.game?.round}</h1>
      <button onClick={() => dispatch({ type: 'PLAYER_SUBMIT', orders: [] })}>
        Seal (debug — empty orders)
      </button>
    </div>
  );
}
