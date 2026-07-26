import type { GameState, LeaderId, ResolutionEvent } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { HUMAN_ACCENTS, PORTRAIT_META, stripFlag } from '../portraits';
import { formatEventText } from '../util/eventText';
import { WORLD_PATH, WORLD_VIEWBOX } from './worldPath';
import styles from './WorldMap.module.css';

export interface CountryPos {
  cx: number;
  cy: number;
  /** Fixed label for AI countries; human labels derive from live state. */
  label?: string;
}

/** Equirectangular screen coords from real lon/lat: x = lon + 180, y = 90 - lat. */
const ll = (lon: number, lat: number): { cx: number; cy: number } => ({ cx: lon + 180, cy: 90 - lat });

/** Leaders pinned at true geographic locations; Freedonia is an invented
 * mid-Atlantic island and the other human slots take open-ocean spots. */
export const COUNTRY_POS: Record<LeaderId, CountryPos> = {
  chump: { ...ll(-98, 39), label: 'USA' },
  carnage: { ...ll(-106, 58), label: 'CANADA' },
  burnem: { ...ll(-2, 54), label: 'UK' },
  netanyahoo: { ...ll(34, 31), label: 'ISR' },
  khameneverhere: { ...ll(53, 32), label: 'IRAN' },
  'mileigh-hem': { ...ll(-64, -38), label: 'ARG' },
  player1: ll(-40, 32), // Freedonia — mid-Atlantic
  player2: ll(-150, 5), // Pacific
  player3: ll(78, -28), // Indian Ocean
  player4: ll(170, 42), // North Pacific
  player5: ll(-25, -45), // South Atlantic
};

/** Small pins for countries that are geographically small / crowded together. */
const SMALL_PIN = new Set<LeaderId>(['burnem', 'netanyahoo']);

/** The event's actor (green highlight). */
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

/** The event's receivers (magenta highlights). */
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
  const midY = Math.min(a.cy, b.cy) - 16;
  return { d: `M ${a.cx} ${a.cy} Q ${midX} ${midY} ${b.cx} ${b.cy}`, midX, midY };
}

/** Yellow-over-magenta launch arc with the flight icon at the apex. */
function LaunchArc({ a, b, icon }: { a: CountryPos; b: CountryPos; icon: string }) {
  const { d, midX, midY } = launchArcPath(a, b);
  return (
    <g>
      <path d={d} fill="none" stroke="var(--yellow)" strokeWidth="1" strokeDasharray="3 2" />
      <path d={d} fill="none" stroke="var(--magenta)" strokeWidth="0.5" />
      <text x={midX} y={midY + 3} fontSize="8" textAnchor="middle">{icon}</text>
    </g>
  );
}

/** Concentric magenta dashed impact rings on the receiver. */
function ImpactRings({ p }: { p: CountryPos }) {
  return (
    <g>
      <ellipse cx={p.cx} cy={p.cy} rx="13" ry="8" fill="none" stroke="var(--magenta)" strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.85" />
      <ellipse cx={p.cx} cy={p.cy} rx="17" ry="10.5" fill="none" stroke="var(--magenta)" strokeWidth="0.4" strokeDasharray="1.5 2" opacity="0.5" />
    </g>
  );
}

/** Green firing pulse circle. */
function Pulse({ p }: { p: CountryPos }) {
  return <circle cx={p.cx} cy={p.cy} r="6" fill="none" stroke="var(--green)" strokeWidth="0.5" />;
}

/** Cyan/green dashed diplomacy trail with an icon at the midpoint. */
function Trail({ a, b, stroke, icon }: { a: CountryPos; b: CountryPos; stroke: string; icon: string }) {
  const midX = (a.cx + b.cx) / 2;
  const midY = (a.cy + b.cy) / 2 - 10;
  return (
    <g>
      <path d={`M ${a.cx} ${a.cy} Q ${midX} ${midY} ${b.cx} ${b.cy}`} fill="none" stroke={stroke} strokeWidth="0.5" strokeDasharray="2 1.5" />
      <text x={midX} y={midY + 2.5} fontSize="5" textAnchor="middle">{icon}</text>
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
        <text className={styles.buildIcon} x={p.cx} y={p.cy - 7} fontSize="5" textAnchor="middle">
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

/** Recognisable real-world map (Natural Earth 110m land, public domain), comic-styled.
 * Pure presentational: coastlines, cast country pins at true lon/lat, per-event overlays. */
export default function WorldMap({ game, event }: WorldMapProps) {
  const actor = event ? actorOf(event) : undefined;
  const receivers = event ? receiversOf(event) : [];
  const freedonia = COUNTRY_POS.player1;

  return (
    <svg className={styles.svg} viewBox={WORLD_VIEWBOX} preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <pattern id="worldOceanDots" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="rgba(255,255,255,0.16)" />
        </pattern>
      </defs>
      {/* ocean — covers the full equirectangular extent so meet-letterboxing reads as sea */}
      <rect x="0" y="0" width="360" height="180" fill="var(--cyan)" />
      <rect x="0" y="0" width="360" height="180" fill="url(#worldOceanDots)" />

      {/* land — real coastlines, one path (evenodd handles rings) */}
      <path d={WORLD_PATH} fillRule="evenodd" fill="var(--paper)" stroke="var(--ink)" strokeWidth="0.5" strokeLinejoin="round" />

      {/* Freedonia — invented mid-Atlantic island under the player's pin */}
      {game.cast.includes('player1') && (
        <path
          d={`M ${freedonia.cx - 6} ${freedonia.cy} Q ${freedonia.cx - 3} ${freedonia.cy - 5} ${freedonia.cx} ${freedonia.cy - 4} Q ${freedonia.cx + 6} ${freedonia.cy - 4} ${freedonia.cx + 6} ${freedonia.cy + 1} Q ${freedonia.cx + 3} ${freedonia.cy + 5} ${freedonia.cx - 2} ${freedonia.cy + 4} Z`}
          fill="var(--cyan-soft)"
          stroke="var(--ink)"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      )}

      {/* country pins — cast members only */}
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
        const small = SMALL_PIN.has(id);
        const rx = small ? 4 : 7;
        const ry = small ? 2.6 : 4;
        return (
          <g key={id} data-leader={id}>
            <ellipse
              cx={p.cx}
              cy={p.cy}
              rx={rx}
              ry={ry}
              fill={fill}
              opacity={isActor || isReceiver ? 0.85 : 0.5}
            />
            <text
              x={p.cx}
              y={p.cy + ry + 3.4}
              fill="var(--ink)"
              fontFamily="Anton, sans-serif"
              fontSize={small ? 3.2 : 3.6}
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
