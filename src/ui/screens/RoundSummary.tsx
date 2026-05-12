import type { ScreenProps } from '../App';
import type { GameState, LeaderId, ResolutionEvent } from '../../engine/types';
import { pickMasthead } from '../../engine/masthead';
import DisparageColumn from '../components/DisparageColumn';
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

  const thisRoundLost = Object.entries(state.prevPopulations).reduce<number>((acc, [idStr, prev]) => {
    if (prev === undefined) return acc;
    const id = idStr as LeaderId;
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
      <header className={styles.masthead}>
        {pickMasthead(game.mastheadOrder, game.round - 1, game.outcome)}
      </header>
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

      <section className={styles.worldReactions}>
        <h2 className={styles.sectionTitle}>World Reactions</h2>
        {game.cast.map((id) => {
          const leader = game.leaders[id];
          if (!leader.alive) return null;
          const prev = state.prevPopulations[id] ?? leader.population;
          const delta = leader.population - prev;
          const reaction = state.events.find(
            (e) => e.kind === 'PostRoundReaction' && e.leaderId === id,
          );
          const quote = reaction?.kind === 'PostRoundReaction' ? reaction.quote : undefined;
          return (
            <div key={id} className={styles.reactionRow}>
              <span className={styles.reactionFlag}>{leader.country.split(' ')[0]}</span>
              <span className={styles.reactionName}>{leader.name}</span>
              <span className={styles.reactionDelta}>{delta >= 0 ? `+${delta}` : delta}M</span>
              {quote && <span className={styles.reactionQuote}>"{quote}"</span>}
            </div>
          );
        })}
      </section>

      <section className={styles.obituaries}>
        {game.cast.map((id) => {
          const leader = game.leaders[id];
          const prev = state.prevPopulations[id];
          // Eliminated this round = alive=false AND prev > 0
          if (leader.alive || prev === undefined || prev <= 0) return null;
          const death = state.events.find(
            (e) => e.kind === 'LeaderEliminated' && e.id === id,
          );
          const quote = death?.kind === 'LeaderEliminated' ? death.quote : undefined;
          return (
            <div key={`obit-${id}`} className={styles.obit}>
              <div className={styles.obitHeader}>OBITUARY: {leader.name}</div>
              {quote && <div className={styles.obitQuote}>"{quote}"</div>}
            </div>
          );
        })}
      </section>

      {(() => {
        const col = state.events.find((e) => e.kind === 'DisparageColumn');
        if (col?.kind === 'DisparageColumn') return <DisparageColumn event={col} />;
        return null;
      })()}

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
