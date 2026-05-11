import type { ScreenProps } from '../App';

export default function Winners({ state, dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Winners (stub)</h1>
      <p>Outcome: {state.game?.outcome?.type ?? 'none'}</p>
      <button onClick={() => dispatch({ type: 'BACK_TO_SETUP' })}>New Game</button>
    </div>
  );
}
