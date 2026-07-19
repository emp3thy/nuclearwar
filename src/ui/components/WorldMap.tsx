import type { GameState, LeaderId, ResolutionEvent } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { HUMAN_ACCENTS, PORTRAIT_META, stripFlag } from '../portraits';
import { formatEventText } from '../util/eventText';
import styles from './WorldMap.module.css';

export interface CountryPos {
  cx: number;
  cy: number;
  /** Fixed label for AI countries; human labels derive from live state. */
  label?: string;
}

/** Map positions — AI values verbatim from the handoff (screens-3.jsx);
 * human slots 2–5 are fixed ocean positions (slice-3 spec §5.2). */
export const COUNTRY_POS: Record<LeaderId, CountryPos> = {
  chump: { cx: 23, cy: 36, label: 'USA' },
  carnage: { cx: 24, cy: 24, label: 'CANADA' },
  burnem: { cx: 44, cy: 13, label: 'UK' },
  netanyahoo: { cx: 58, cy: 40, label: 'ISR' },
  khameneverhere: { cx: 64, cy: 38, label: 'IRAN' },
  'mileigh-hem': { cx: 33, cy: 78, label: 'ARG' },
  player1: { cx: 22, cy: 50 },
  player2: { cx: 10, cy: 62 },
  player3: { cx: 84, cy: 18 },
  player4: { cx: 90, cy: 68 },
  player5: { cx: 44, cy: 66 },
};

/** The event's actor (green highlight), per slice-3 spec §5.3. */
export function actorOf(event: ResolutionEvent): LeaderId | undefined {
  switch (event.kind) {
    case 'FactoryBuilt':
    case 'DeliveryBuilt':
    case 'WarheadBuilt':
    case 'DefenceBuilt':
    case 'DefenceDeployed':
    case 'FinalRetaliationTriggered':
      return event.by;
    case 'PropagandaTransfer':
    case 'WooApplied':
    case 'MissileLaunched':
    case 'MissileIntercepted':
    case 'ImpactPeople':
    case 'ImpactInfrastructure':
      return event.from;
    default:
      return undefined;
  }
}

/** The event's receivers (magenta highlights), per slice-3 spec §5.3. */
export function receiversOf(event: ResolutionEvent): LeaderId[] {
  switch (event.kind) {
    case 'PropagandaTransfer':
    case 'WooApplied':
    case 'MissileLaunched':
    case 'MissileIntercepted':
      return [event.to];
    case 'ImpactPeople':
    case 'ImpactInfrastructure':
      return [event.target];
    case 'LeaderEliminated':
      return [event.id];
    case 'FinalRetaliationTriggered':
      return [...event.targets];
    default:
      return [];
  }
}

function launchArcPath(a: CountryPos, b: CountryPos): { d: string; midX: number; midY: number } {
  const midX = (a.cx + b.cx) / 2;
  const midY = Math.min(a.cy, b.cy) - 18;
  return { d: `M ${a.cx} ${a.cy} Q ${midX} ${midY} ${b.cx} ${b.cy}`, midX, midY };
}

/** Yellow-over-magenta launch arc with the flight icon at the apex. */
function LaunchArc({ a, b, icon }: { a: CountryPos; b: CountryPos; icon: string }) {
  const { d, midX, midY } = launchArcPath(a, b);
  return (
    <g>
      <path d={d} fill="none" stroke="var(--yellow)" strokeWidth="0.6" strokeDasharray="1.5 1" />
      <path d={d} fill="none" stroke="var(--magenta)" strokeWidth="0.3" />
      <text x={midX} y={midY + 4} fontSize="5" textAnchor="middle">{icon}</text>
    </g>
  );
}

/** Concentric magenta dashed impact rings on the receiver. */
function ImpactRings({ p }: { p: CountryPos }) {
  return (
    <g>
      <ellipse cx={p.cx} cy={p.cy} rx="9" ry="5" fill="none" stroke="var(--magenta)" strokeWidth="0.6" strokeDasharray="1 0.8" opacity="0.85" />
      <ellipse cx={p.cx} cy={p.cy} rx="11.5" ry="7" fill="none" stroke="var(--magenta)" strokeWidth="0.3" strokeDasharray="0.8 1.2" opacity="0.5" />
    </g>
  );
}

/** Green firing pulse circle. */
function Pulse({ p }: { p: CountryPos }) {
  return <circle cx={p.cx} cy={p.cy} r="5" fill="none" stroke="var(--green)" strokeWidth="0.4" />;
}

/** Cyan/green dashed diplomacy trail with an icon at the midpoint. */
function Trail({ a, b, stroke, icon }: { a: CountryPos; b: CountryPos; stroke: string; icon: string }) {
  const midX = (a.cx + b.cx) / 2;
  const midY = (a.cy + b.cy) / 2 - 6;
  return (
    <g>
      <path d={`M ${a.cx} ${a.cy} Q ${midX} ${midY} ${b.cx} ${b.cy}`} fill="none" stroke={stroke} strokeWidth="0.4" strokeDasharray="0.8 0.6" />
      <text x={midX} y={midY + 1.5} fontSize="3.6" textAnchor="middle">{icon}</text>
    </g>
  );
}

function Overlay({ event, game }: { event: ResolutionEvent; game: GameState }) {
  switch (event.kind) {
    case 'MissileLaunched':
    case 'ImpactPeople':
    case 'ImpactInfrastructure': {
      const a = COUNTRY_POS[event.from];
      const b = COUNTRY_POS[event.kind === 'MissileLaunched' ? event.to : event.target];
      const icon = event.kind === 'MissileLaunched' && event.delivery === 'bomber' ? '🛩' : '🚀';
      return (
        <g>
          <LaunchArc a={a} b={b} icon={icon} />
          <ImpactRings p={b} />
          <Pulse p={a} />
        </g>
      );
    }
    case 'MissileIntercepted': {
      const a = COUNTRY_POS[event.from];
      const b = COUNTRY_POS[event.to];
      return (
        <g>
          <LaunchArc a={a} b={b} icon="🛡" />
          <Pulse p={b} />
        </g>
      );
    }
    case 'PropagandaTransfer':
      return <Trail a={COUNTRY_POS[event.from]} b={COUNTRY_POS[event.to]} stroke="var(--cyan)" icon="📃" />;
    case 'WooApplied':
      return <Trail a={COUNTRY_POS[event.from]} b={COUNTRY_POS[event.to]} stroke="var(--green)" icon="🤝" />;
    case 'FactoryBuilt':
    case 'DeliveryBuilt':
    case 'WarheadBuilt':
    case 'DefenceBuilt':
    case 'DefenceDeployed': {
      const p = COUNTRY_POS[event.by];
      const icon = formatEventText(event, game, 1)?.icon ?? '⚙';
      return (
        <text className={styles.buildIcon} x={p.cx} y={p.cy - 5} fontSize="4" textAnchor="middle">
          {icon}
        </text>
      );
    }
    case 'FinalRetaliationTriggered': {
      const a = COUNTRY_POS[event.by];
      return (
        <g>
          {event.targets.map((t) => (
            <g key={t}>
              <LaunchArc a={a} b={COUNTRY_POS[t]} icon="🚀" />
              <ImpactRings p={COUNTRY_POS[t]} />
            </g>
          ))}
          <Pulse p={a} />
        </g>
      );
    }
    default:
      return null;
  }
}

export interface WorldMapProps {
  game: GameState;
  /** The step's event; omit for an empty round (markers only, no overlays). */
  event?: ResolutionEvent;
}

/** Stylised political-cartoon world map (slice-3 spec §5).
 * Pure presentational: continents, cast country highlights, per-event overlays. */
export default function WorldMap({ game, event }: WorldMapProps) {
  const actor = event ? actorOf(event) : undefined;
  const receivers = event ? receiversOf(event) : [];

  return (
    <svg className={styles.svg} viewBox="0 0 100 85" preserveAspectRatio="none" aria-hidden>
      {/* continents — abstract chunky political-cartoon shapes (verbatim from the handoff) */}
      <g fill="var(--paper)" stroke="var(--ink)" strokeWidth="0.4">
        <path d="M 5,18 Q 12,12 22,14 Q 32,12 36,22 Q 40,32 30,40 Q 18,44 10,38 Q 2,30 5,18 Z" />
        <path d="M 18,46 Q 26,44 32,50 Q 36,60 30,70 Q 24,80 18,76 Q 14,68 16,58 Q 16,50 18,46 Z" />
        <path d="M 38,18 Q 46,16 52,22 Q 56,30 50,34 Q 42,32 38,26 Z" />
        <path d="M 52,22 Q 60,20 66,24 Q 72,28 70,34 Q 64,38 56,36 Q 50,30 52,22 Z" />
        <path d="M 48,32 Q 58,32 64,40 Q 66,48 58,54 Q 50,52 46,44 Q 44,36 48,32 Z" />
        <path d="M 62,40 Q 74,42 78,46 L 82,52 Q 78,60 70,58 Q 64,52 62,40 Z" />
        {/* UK — separate island northwest of Europe */}
        <path d="M 39,9 Q 46,7 49,12 Q 50,18 44,19 Q 38,17 39,9 Z" />
        <text x="44" y="14" fill="var(--ink)" fontFamily="Anton, sans-serif" fontSize="2.2" textAnchor="middle" letterSpacing="0.3" opacity="0.55">UK</text>
      </g>

      {/* country highlights — cast members only */}
      {game.cast.map((id) => {
        const p = COUNTRY_POS[id];
        const isActor = actor === id;
        const isReceiver = receivers.includes(id);
        const fill = isActor
          ? 'var(--green)'
          : isReceiver
            ? 'var(--magenta)'
            : isHuman(id)
              ? HUMAN_ACCENTS[id]
              : PORTRAIT_META[id].color;
        const label = p.label ?? stripFlag(game.leaders[id].country).toUpperCase();
        const isUK = id === 'burnem';
        return (
          <g key={id} data-leader={id}>
            <ellipse
              cx={p.cx}
              cy={p.cy}
              rx={isUK ? 3 : 6}
              ry={isUK ? 2 : 3.4}
              fill={fill}
              opacity={isActor || isReceiver ? 0.85 : 0.5}
            />
            <text
              x={p.cx}
              y={p.cy + (isUK ? 4 : 6)}
              fill="var(--ink)"
              fontFamily="Anton, sans-serif"
              fontSize={isUK ? 2 : 2.4}
              textAnchor="middle"
              letterSpacing="0.2"
            >
              {label}
            </text>
          </g>
        );
      })}

      {event && <Overlay event={event} game={game} />}
    </svg>
  );
}
