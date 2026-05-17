import type { ScreenProps } from '../App';
import type { GameState, LeaderId, WinOutcome } from '../../engine/types';
import styles from './Winners.module.css';

function pickHeadline(outcome: WinOutcome, leaders: GameState['leaders']): string {
  switch (outcome.type) {
    case 'apocalypse': return 'WINNER: NOBODY';
    case 'survivor':
    case 'pyrrhic':
      return `${leaders[outcome.winner].name.toUpperCase()} WINS`;
  }
}

function pickSubLine(
  outcome: WinOutcome,
  leaders: GameState['leaders'],
  initialPopulations: Partial<Record<LeaderId, number>>,
): string {
  switch (outcome.type) {
    case 'apocalypse':
      return 'Total casualties: 100% of starting population. The board is dark.';
    case 'survivor': {
      const winner = leaders[outcome.winner];
      return `${winner.name} rules over ${winner.population}M. The rest are ash.`;
    }
    case 'pyrrhic': {
      const winner = leaders[outcome.winner];
      const initial = initialPopulations[outcome.winner] ?? winner.population;
      return `${winner.name} had ${initial}M when the bombs flew. They have 0M now. So does everyone else. Briefly, they had more.`;
    }
  }
}

export default function Winners({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const outcome = game.outcome!;
  const headline = pickHeadline(outcome, game.leaders);
  const subLine = pickSubLine(outcome, game.leaders, state.initialPopulations);

  const tollRows = game.cast.map((id) => {
    const leader = game.leaders[id];
    const start = state.initialPopulations[id] ?? leader.population;
    const end = leader.population;
    const pctLost = start === 0 ? 0 : ((start - end) / start) * 100;
    return { id, name: leader.name, country: leader.country, start, end, pctLost };
  });
  tollRows.sort((a, b) => a.pctLost - b.pctLost);

  function newGame() { dispatch({ type: 'BACK_TO_SETUP' }); }
  function sameCast() {
    if (!state.lastNewGameOpts) return newGame();
    dispatch({
      type: 'START_GAME',
      opts: { ...state.lastNewGameOpts, seed: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) },
    });
  }

  return (
    <div className={styles.winners}>
      <h1 className={styles.headline}>{headline}</h1>
      <p className={styles.subline}>"{subLine}"</p>

      <h2 className={styles.sectionTitle}>Death Toll</h2>
      <table className={styles.tollTable}>
        <thead>
          <tr>
            <th>Leader</th>
            <th>Start</th>
            <th>End</th>
            <th>% lost</th>
          </tr>
        </thead>
        <tbody>
          {tollRows.map((row) => (
            <tr key={row.id} className={row.id === 'player1' ? styles.playerRow : ''}>
              <td>{row.country.split(' ')[0]} {row.name}{row.id === 'player1' ? ' (you)' : ''}</td>
              <td className={styles.numCell}>{row.start}M</td>
              <td className={styles.numCell}>{row.end}M</td>
              <td className={styles.numCell}>{row.pctLost.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.buttonRow}>
        <button type="button" className={styles.button} onClick={newGame}>New Game</button>
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={sameCast}>
          Same Cast, Again
        </button>
      </div>
    </div>
  );
}
