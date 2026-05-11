import type { ScreenProps } from '../App';
import type { GameState, LeaderId, ResolutionEvent } from '../../engine/types';
import styles from './RoundSummary.module.css';

function pickHeadline(
  events: ResolutionEvent[],
  leaders: GameState['leaders'],
  prevPopulations: Partial<Record<LeaderId, number>>,
  round: number,
  outcome: GameState['outcome'],
): string {
  if (outcome?.type === 'apocalypse') return 'THE END.';

  const elims = events.filter((e): e is Extract<ResolutionEvent, { kind: 'LeaderEliminated' }> =>
    e.kind === 'LeaderEliminated',
  );
  if (elims.length > 0) return `${leaders[elims[0].id].name.toUpperCase()} ELIMINATED`;

  let worstId: LeaderId | null = null;
  let worstDelta = 0;
  for (const idStr of Object.keys(prevPopulations)) {
    const id = idStr as LeaderId;
    const prev = prevPopulations[id]!;
    const delta = leaders[id].population - prev;
    if (delta < worstDelta) { worstDelta = delta; worstId = id; }
  }
  if (worstId !== null && worstDelta <= -10) return `${leaders[worstId].name.toUpperCase()} CLOBBERED`;
  if (worstId !== null && worstDelta <= -3) return `${leaders[worstId].name.toUpperCase()} STRUCK`;
  return `ROUND ${round - 1} SETTLES`;
}

function pickSubhead(events: ResolutionEvent[], leaders: GameState['leaders']): string {
  const impacts = events.filter((e): e is Extract<ResolutionEvent, { kind: 'ImpactPeople' }> =>
    e.kind === 'ImpactPeople',
  );
  if (impacts.length === 0) return 'No casualties this round.';
  const biggest = impacts.reduce((a, b) => (a.deaths > b.deaths ? a : b));
  return `${leaders[biggest.from].name} hits ${leaders[biggest.target].name} for ${biggest.deaths}M.`;
}

export default function RoundSummary({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const headline = pickHeadline(state.events, game.leaders, state.prevPopulations, game.round, game.outcome);
  const subhead = pickSubhead(state.events, game.leaders);

  const thisRoundLost = Object.values(state.prevPopulations).reduce<number>((acc, prev, idx) => {
    const id = game.cast[idx];
    if (!id || prev === undefined) return acc;
    return acc + Math.max(0, prev - game.leaders[id].population);
  }, 0);
  const warTotalLost = Object.entries(state.initialPopulations).reduce<number>((acc, [idStr, init]) => {
    const id = idStr as LeaderId;
    if (init === undefined) return acc;
    return acc + Math.max(0, init - game.leaders[id].population);
  }, 0);
  const survivors = game.cast.filter((id) => game.leaders[id].alive).length;

  const continueLabel = game.outcome ? 'Final Verdict' : `Round ${game.round} → Plan`;

  return (
    <div className={styles.summary}>
      <div className={styles.masthead}>─── THE NUKE TIMES ───  R {game.round - 1}</div>
      <h1 className={`${styles.headline} ${game.outcome?.type === 'apocalypse' ? styles.theEnd : ''}`}>
        {headline}
      </h1>
      <p className={styles.subhead}>{subhead}</p>

      <div className={styles.casualtyStrip}>
        <div className={styles.casualtyPlaceholder}>[ mushroom-cloud SVG — P4a ]</div>
        <div className={styles.casualtyRow}>This round: {thisRoundLost}M lost</div>
        <div className={styles.casualtyRow}>War total: {warTotalLost}M lost</div>
        <div className={styles.casualtyRow}>Survivors: {survivors} of {game.cast.length}</div>
      </div>

      <h2 className={styles.sectionTitle}>World Reactions</h2>
      <div className={styles.reactionsList}>
        {game.cast.map((id) => {
          const leader = game.leaders[id];
          const prev = state.prevPopulations[id] ?? leader.population;
          const delta = leader.population - prev;
          const sign = delta > 0 ? '△' : delta < 0 ? '▽' : '─';
          const eliminated = !leader.alive;
          return (
            <div key={id} className={`${styles.reactionRow} ${eliminated ? styles.obituary : ''}`}>
              <span className={styles.flag}>{leader.country.split(' ')[0]}</span>
              <span className={styles.name}>
                {eliminated && 'OBITUARY: '}{leader.name}
              </span>
              <span className={styles.delta}>{sign} {Math.abs(delta)}</span>
              <span className={styles.state}>{eliminated ? 'eliminated' : 'alive'}</span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.continueBtn}
        onClick={() => dispatch({ type: 'NEXT_ROUND' })}
      >
        {continueLabel}
      </button>
    </div>
  );
}
