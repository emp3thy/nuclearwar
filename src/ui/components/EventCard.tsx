import type { GameState, ResolutionEvent } from '../../engine/types';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: ResolutionEvent;
  game: GameState;
}

export default function EventCard({ event, game }: EventCardProps) {
  const { icon, body, className } = formatEventCard(event, game);
  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.body}>{body}</span>
    </div>
  );
}

function flag(game: GameState, id: keyof GameState['leaders']): string {
  return game.leaders[id]?.country.split(' ')[0] ?? id;
}
function name(game: GameState, id: keyof GameState['leaders']): string {
  return game.leaders[id]?.name ?? id;
}

export function formatEventCard(
  event: ResolutionEvent,
  game: GameState,
): { icon: string; body: string; className?: string } {
  switch (event.kind) {
    case 'OrdersSealed':
      return { icon: '', body: '' };  // not rendered
    case 'FactoryBuilt':
      return { icon: '⚙', body: `${flag(game, event.by)} ${name(game, event.by)} builds 1 factory` };
    case 'DeliveryBuilt':
      return {
        icon: event.type === 'missile' ? '🚀' : '🛩',
        body: `${flag(game, event.by)} ${name(game, event.by)} builds 1 ${event.type}`,
      };
    case 'WarheadBuilt':
      return { icon: '☢', body: `${flag(game, event.by)} ${name(game, event.by)} builds 1 ${event.yield} warhead` };
    case 'DefenceBuilt':
      return {
        icon: '🛡',
        body: `${flag(game, event.by)} ${name(game, event.by)} builds 1 ${event.type === 'shield' ? 'shield' : 'AA'}`,
      };
    case 'PropagandaTransfer':
      return {
        icon: '📰',
        body: `${flag(game, event.from)} → ${flag(game, event.to)} · ${event.amount}M transferred`,
      };
    case 'WooApplied':
      return {
        icon: '🤝',
        body: `${flag(game, event.from)} woos ${flag(game, event.to)} · ${event.points} points`,
      };
    case 'MissileLaunched':
      return {
        icon: event.delivery === 'missile' ? '🚀' : '🛩',
        body: `${flag(game, event.from)} → ${flag(game, event.to)} (${event.warhead} · ${event.targetType})`,
      };
    case 'MissileIntercepted':
      return {
        icon: '🛡✗',
        body: `${name(game, event.from)}'s ${event.delivery} to ${name(game, event.to)} intercepted`,
      };
    case 'ImpactPeople':
      return {
        icon: '☠️',
        body: `${flag(game, event.target)} ${name(game, event.target)} ─ ${event.deaths}M deaths (from ${flag(game, event.from)})`,
      };
    case 'ImpactInfrastructure':
      return {
        icon: '🏭✗',
        body: `${flag(game, event.target)} ${name(game, event.target)} ─ ${event.factoriesDestroyed} factories destroyed`,
      };
    case 'LeaderEliminated':
      return {
        icon: '⬛',
        body: `${name(game, event.id)} eliminated`,
        className: styles.obituary,
      };
    case 'FinalRetaliationTriggered':
      return {
        icon: '💥',
        body: `${flag(game, event.by)} launches Final Retaliation at ${event.targets.map((t) => flag(game, t)).join(', ')}`,
      };
    case 'OutcomeReached':
      return { icon: '', body: '' };  // not rendered
  }
}
