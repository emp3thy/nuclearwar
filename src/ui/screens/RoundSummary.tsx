import type { ScreenProps } from '../App';

export default function RoundSummary({ state, dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Round Summary (stub) — Round {state.game?.round}</h1>
      <button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
        Round {(state.game?.round ?? 0) + 1} → Plan
      </button>
    </div>
  );
}
