import type { ScreenProps } from '../App';
import type { ResolutionEvent } from '../../engine/types';
import EventCard from '../components/EventCard';
import PhaseTracker from '../components/PhaseTracker';
import styles from './Action.module.css';

type Phase = 'DEFENCES' | 'BUILDS' | 'PROPAGANDA' | 'WOOING' | 'LAUNCHES' | 'FINAL_RETALIATIONS';

const PHASE_ORDER: Phase[] = ['DEFENCES', 'BUILDS', 'PROPAGANDA', 'WOOING', 'LAUNCHES', 'FINAL_RETALIATIONS'];
const PHASE_LABELS: Record<Phase, string> = {
  DEFENCES: 'Defences',
  BUILDS: 'Builds',
  PROPAGANDA: 'Propaganda',
  WOOING: 'Wooing',
  LAUNCHES: 'Launches',
  FINAL_RETALIATIONS: 'Final Retaliations',
};

/** Returns the phase a "phase-advancing" event belongs to, or null for
 *  events that should NOT advance the cursor (LeaderEliminated, OrdersSealed,
 *  OutcomeReached — those inherit the current phase or aren't rendered). */
function phaseAdvanceFor(kind: ResolutionEvent['kind']): Phase | null {
  switch (kind) {
    case 'DefenceBuilt': return 'DEFENCES';
    case 'FactoryBuilt':
    case 'DeliveryBuilt':
    case 'WarheadBuilt': return 'BUILDS';
    case 'PropagandaTransfer': return 'PROPAGANDA';
    case 'WooApplied': return 'WOOING';
    case 'MissileLaunched':
    case 'MissileIntercepted':
    case 'ImpactPeople':
    case 'ImpactInfrastructure': return 'LAUNCHES';
    case 'FinalRetaliationTriggered': return 'FINAL_RETALIATIONS';
    // Non-phase-advancing kinds:
    case 'LeaderEliminated':
    case 'OrdersSealed':
    case 'OutcomeReached': return null;
  }
}

function isRenderable(kind: ResolutionEvent['kind']): boolean {
  return kind !== 'OrdersSealed' && kind !== 'OutcomeReached';
}

export default function Action({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const byPhase: Record<Phase, ResolutionEvent[]> = {
    DEFENCES: [], BUILDS: [], PROPAGANDA: [], WOOING: [], LAUNCHES: [], FINAL_RETALIATIONS: [],
  };
  let cursor: Phase = 'DEFENCES';  // first phase the engine emits into
  for (const e of state.events) {
    const advance = phaseAdvanceFor(e.kind);
    if (advance !== null) cursor = advance;
    if (isRenderable(e.kind)) byPhase[cursor].push(e);
  }

  const continueLabel = game.outcome ? 'View Final Verdict' : 'Continue → Round Summary';

  return (
    <div className={styles.action}>
      <header className={styles.header}>Round {game.round - 1} — events</header>
      <PhaseTracker />

      {PHASE_ORDER.map((phase) => {
        const events = byPhase[phase];
        if (events.length === 0) return null;
        return (
          <section key={phase} className={styles.phaseSection}>
            <h2 className={styles.phaseHeader}>{PHASE_LABELS[phase]}</h2>
            {events.map((e, i) => <EventCard key={i} event={e} game={game} />)}
          </section>
        );
      })}

      <button
        type="button"
        className={styles.continueBtn}
        onClick={() => dispatch({ type: 'ACTION_DONE' })}
      >
        {continueLabel}
      </button>
    </div>
  );
}
