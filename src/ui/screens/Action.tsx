import { useEffect, useMemo, useState } from 'react';
import type { ScreenProps } from '../App';
import type { LeaderId, ResolutionEvent } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { Bubble, Burst, DamageBadge, PhaseTrack, RoundBadge, Stamp, Tag } from '../components/comic';
import Portrait from '../components/Portrait';
import WorldMap, { actorOf, receiversOf } from '../components/WorldMap';
import DisparageCard from '../components/DisparageCard';
import { groupPhaseEvents } from '../util/eventGrouping';
import { formatEventText } from '../util/eventText';
import { extractFlag } from '../portraits';
import styles from './Action.module.css';

type Phase = 'DEFENCES' | 'BUILDS' | 'PROPAGANDA' | 'WOOING' | 'LAUNCHES' | 'FINAL_RETALIATIONS';

const PHASE_ORDER: Phase[] = ['DEFENCES', 'BUILDS', 'PROPAGANDA', 'WOOING', 'LAUNCHES', 'FINAL_RETALIATIONS'];
const PHASE_LABELS: Record<Phase, string> = {
  DEFENCES: 'DEFENCE',
  BUILDS: 'BUILDS',
  PROPAGANDA: 'PROPAGANDA',
  WOOING: 'WOOING',
  LAUNCHES: 'LAUNCHES',
  FINAL_RETALIATIONS: 'FINAL RETAL.',
};

/** Auto-advance dwell per step (slice-3 spec §2.2). */
const DWELL_MS = 2700;
const DWELL_FAST_MS = 1100;

/** Returns the phase a "phase-advancing" event belongs to, or null for
 *  events that should NOT advance the cursor (LeaderEliminated, OrdersSealed,
 *  OutcomeReached — those inherit the current phase or aren't rendered). */
function phaseAdvanceFor(kind: ResolutionEvent['kind']): Phase | null {
  switch (kind) {
    case 'DefenceBuilt':
    case 'DefenceDeployed': return 'DEFENCES';
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
    case 'OutcomeReached':
    case 'DefenceConsumed':
    case 'PreRoundMood':
    case 'PostRoundReaction':
    case 'DisparageCameo':
    case 'DisparageColumn': return null;
  }
}

function isRenderable(kind: ResolutionEvent['kind']): boolean {
  return (
    kind !== 'OrdersSealed' &&
    kind !== 'OutcomeReached' &&
    kind !== 'DefenceConsumed' &&
    kind !== 'PreRoundMood' &&
    kind !== 'PostRoundReaction' &&
    kind !== 'DisparageColumn'
  );
}

type Cameo = Extract<ResolutionEvent, { kind: 'DisparageCameo' }>;

export interface PlaybackStep {
  phase: Phase;
  /** The grouped representative event. */
  event: ResolutionEvent;
  /** How many identical build events this step stands for (from groupPhaseEvents). */
  count: number;
  /** Disparage cameo attached to this impact step, if the engine emitted one. */
  cameo?: Cameo;
}

/**
 * Flatten a round's ResolutionEvents into the sequential playback step list
 * (slice-3 spec §2.1): phase-cursor bucketing, groupPhaseEvents per phase,
 * phases flattened in PHASE_ORDER. DisparageCameo events never become steps —
 * each attaches to the impact step matching its `afterImpact` pair (the pair
 * survives groupPhaseEvents' duplicate-impact collapse); unmatched cameos drop.
 */
export function buildPlaybackSteps(events: ResolutionEvent[]): PlaybackStep[] {
  const byPhase: Record<Phase, ResolutionEvent[]> = {
    DEFENCES: [], BUILDS: [], PROPAGANDA: [], WOOING: [], LAUNCHES: [], FINAL_RETALIATIONS: [],
  };
  const cameos: Cameo[] = [];
  let cursor: Phase = 'DEFENCES';  // first phase the engine emits into
  for (const e of events) {
    const advance = phaseAdvanceFor(e.kind);
    if (advance !== null) cursor = advance;
    if (e.kind === 'DisparageCameo') {
      cameos.push(e);
      continue;
    }
    if (isRenderable(e.kind)) byPhase[cursor].push(e);
  }

  const steps: PlaybackStep[] = [];
  for (const phase of PHASE_ORDER) {
    for (const g of groupPhaseEvents(byPhase[phase])) {
      steps.push({ phase, event: g.event, count: g.count });
    }
  }

  for (const cameo of cameos) {
    const step = steps.find(
      (s) =>
        (s.event.kind === 'ImpactPeople' || s.event.kind === 'ImpactInfrastructure') &&
        s.event.from === cameo.afterImpact.from &&
        s.event.target === cameo.afterImpact.to,
    );
    // The engine caps cameos at one per round, so no step ever carries two.
    if (step && !step.cameo) step.cameo = cameo;
  }

  return steps;
}

function burstFor(event: ResolutionEvent): { text: string; color: string } | null {
  switch (event.kind) {
    // Zero-damage guard (spec §6): burst and badge suppressed together.
    case 'ImpactPeople':
      return event.deaths > 0 ? { text: 'BOOM!', color: 'yellow' } : null;
    case 'ImpactInfrastructure':
      return event.factoriesDestroyed > 0 ? { text: 'WHAM!', color: 'yellow' } : null;
    case 'MissileIntercepted':
      return { text: 'INTERCEPTED!', color: 'cyan' };
    case 'FinalRetaliationTriggered':
      return { text: 'EVERYTHING!', color: 'magenta' };
    default:
      return null;
  }
}

function badgeFor(event: ResolutionEvent): { value: number; label: string } | null {
  if (event.kind === 'ImpactPeople' && event.deaths > 0) {
    return { value: event.deaths, label: 'M' };
  }
  if (event.kind === 'ImpactInfrastructure' && event.factoriesDestroyed > 0) {
    return { value: event.factoriesDestroyed, label: 'FACT' };
  }
  return null;
}

export default function Action({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const steps = useMemo(() => buildPlaybackSteps(state.events), [state.events]);

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      setIdx((i) => (i < steps.length - 1 ? i + 1 : i));
    }, fast ? DWELL_FAST_MS : DWELL_MS);
    return () => clearTimeout(t);
  }, [idx, paused, fast, steps.length]);

  const step: PlaybackStep | undefined = steps[idx];
  const isLast = idx === steps.length - 1;
  const doneLabel = game.outcome ? 'TO THE VERDICT →' : 'TO THE NEWS →';

  const text = step ? formatEventText(step.event, game, step.count) : null;
  const actor = step ? actorOf(step.event) : undefined;
  const receiver = step ? receiversOf(step.event)[0] : undefined;
  const burst = step ? burstFor(step.event) : null;
  const badge = step ? badgeFor(step.event) : null;

  const donePhases = step
    ? PHASE_ORDER.filter((p, i) => i < PHASE_ORDER.indexOf(step.phase) && steps.some((s) => s.phase === p))
        .map((p) => PHASE_LABELS[p])
    : [];

  const flagFor = (id: LeaderId) =>
    isHuman(id) ? extractFlag(game.leaders[id].country) : undefined;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <RoundBadge round={game.round - 1} label="ROUND" />
          <span className={`display ${styles.title}`}>ACTION</span>
        </div>
        <div className={styles.headerRight}>
          <button type="button" className={styles.ctrlBtn} onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>
          <button type="button" className={styles.ctrlBtn} onClick={() => setFast((f) => !f)}>
            {fast ? '1×' : '⏭ FAST 3×'}
          </button>
          <button type="button" className={styles.ctrlBtn} onClick={() => dispatch({ type: 'ACTION_DONE' })}>
            SKIP →
          </button>
        </div>
      </header>

      <div className={styles.trackWrap}>
        <PhaseTrack
          phases={PHASE_ORDER.map((p) => PHASE_LABELS[p])}
          current={step ? PHASE_LABELS[step.phase] : ''}
          done={donePhases}
        />
      </div>

      <div className={styles.banner}>
        {step ? (
          <>
            <Tag color="yellow" style={{ marginRight: 8 }}>NOW {PHASE_LABELS[step.phase]}</Tag>
            <span>{text ? `${text.icon} ${text.body}` : ''}</span>
          </>
        ) : (
          <span>An eerily quiet round. Nobody did anything.</span>
        )}
      </div>

      <div className={styles.map} key={idx}>
        <WorldMap game={game} event={step?.event} />

        {actor !== undefined && (
          <div className={styles.actorPortrait}>
            {/* entrance animation on an inner div so its fill-mode transform
                never overrides the wrapper's ≤600px scale(0.7) */}
            <div className="popin">
              <Portrait leaderId={actor} size={110} flag={flagFor(actor)} />
              <div className={styles.namePill}>{game.leaders[actor].name.toUpperCase()}</div>
            </div>
          </div>
        )}
        {receiver !== undefined && (
          <div className={styles.receiverPortrait}>
            <div className="popin">
              <div className={styles.receiverInner}>
                <Portrait leaderId={receiver} size={110} flag={flagFor(receiver)} />
                {step !== undefined && step.event.kind === 'LeaderEliminated' && (
                  <div className={styles.eliminatedStamp}>
                    <Stamp color="magenta" rotate={-14}>ELIMINATED</Stamp>
                  </div>
                )}
              </div>
              <div className={styles.namePill}>{game.leaders[receiver].name.toUpperCase()}</div>
            </div>
          </div>
        )}

        {text?.quote && (
          <div className={`fadein ${styles.bubbleWrap}`}>
            <Bubble tail="bl"><span className="hand">{text.quote}</span></Bubble>
          </div>
        )}

        {(burst !== null || badge !== null) && (
          <div className={styles.impactBadge}>
            <div className="popin">
              {burst !== null && (
                <div className={styles.burstWrap}>
                  <Burst color={burst.color} rotate={-6} size={28}>{burst.text}</Burst>
                </div>
              )}
              {badge !== null && <DamageBadge value={badge.value} label={badge.label} rotate={-8} />}
            </div>
          </div>
        )}

        {step?.cameo && (
          <div className={`fadein ${styles.cameoWrap}`}>
            <DisparageCard event={step.cameo} />
          </div>
        )}
      </div>

      <div className={styles.detailStrip}>
        {steps.length === 0 ? (
          <div className={styles.stripControls}>
            <button type="button" className={styles.ctrlBtn} onClick={() => dispatch({ type: 'ACTION_DONE' })}>
              {doneLabel}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.dots}>
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={styles.dot}
                  data-state={i < idx ? 'past' : i === idx ? 'current' : 'future'}
                />
              ))}
            </div>
            <div className={`hand ${styles.detailQuote}`}>{text?.quote ?? ''}</div>
            <div className={styles.stripControls}>
              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
              >
                ← PREV
              </button>
              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={() => (isLast ? dispatch({ type: 'ACTION_DONE' }) : setIdx(idx + 1))}
              >
                {isLast ? doneLabel : 'NEXT →'}
              </button>
              <span className={`mono ${styles.counter}`}>
                Event {idx + 1} of {steps.length}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
