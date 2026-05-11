import type { ScreenProps } from '../App';

export default function Action({ state, dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Action (stub) — {state.events.length} events</h1>
      <button onClick={() => dispatch({ type: 'ACTION_DONE' })}>
        Continue
      </button>
    </div>
  );
}
