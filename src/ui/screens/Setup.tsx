import type { ScreenProps } from '../App';

export default function Setup({ dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Setup (stub)</h1>
      <button
        onClick={() =>
          dispatch({
            type: 'START_GAME',
            opts: {
              cast: ['player1', 'chump', 'carnage'],
              difficulty: 'normal',
              seed: 'stub-seed',
            },
          })
        }
      >
        Start (debug)
      </button>
    </div>
  );
}
