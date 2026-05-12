import type { GameState, ResolutionEvent } from '../../engine/types';
import DisparageCard from './DisparageCard';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: ResolutionEvent;
  game: GameState;
}

export default function EventCard({ event, game }: EventCardProps) {
  if (event.kind === 'DisparageCameo') return <DisparageCard event={event} />;
  const result = formatEventCard(event, game);
  if (!result) return null;
  const { icon, body, className, quote } = result;
  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.bodyColumn}>
        <span className={styles.body}>{body}</span>
        {quote && <span className={styles.quote}>{quote}</span>}
      </div>
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
): { icon: string; body: string; className?: string; quote?: string } | null {
  switch (event.kind) {
    case 'OrdersSealed':
      return null;  // not rendered
    case 'FactoryBuilt':
      return { icon: '⚙', body: `${flag(game, event.by)} ${name(game, event.by)} builds 1 factory`, quote: event.quote };
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
        quote: event.quote,
      };
    case 'PropagandaTransfer':
      return {
        icon: '📰',
        body: `${flag(game, event.from)} → ${flag(game, event.to)} · ${event.amount}M transferred`,
        quote: [event.senderQuote, event.receiverQuote].filter(Boolean).join(' — ') || undefined,
      };
    case 'WooApplied':
      return {
        icon: '🤝',
        body: `${flag(game, event.from)} woos ${flag(game, event.to)} · ${event.points} points`,
        quote: [event.senderQuote, event.receiverQuote].filter(Boolean).join(' — ') || undefined,
      };
    case 'MissileLaunched':
      return {
        icon: event.delivery === 'missile' ? '🚀' : '🛩',
        body: `${flag(game, event.from)} → ${flag(game, event.to)} (${event.warhead} · ${event.targetType})`,
        quote: event.attackerQuote,
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
        quote: event.targetQuote,
      };
    case 'ImpactInfrastructure':
      return {
        icon: '🏭✗',
        body: `${flag(game, event.target)} ${name(game, event.target)} ─ ${event.factoriesDestroyed} factories destroyed`,
        quote: event.targetQuote,
      };
    case 'LeaderEliminated':
      return {
        icon: '⬛',
        body: `${name(game, event.id)} eliminated`,
        className: styles.obituary,
        quote: event.quote,
      };
    case 'FinalRetaliationTriggered':
      return {
        icon: '💥',
        body: `${flag(game, event.by)} launches Final Retaliation at ${event.targets.map((t) => flag(game, t)).join(', ')}`,
        quote: event.quote,
      };
    case 'OutcomeReached':
      return null;  // not rendered
    // Not rendered on Action screen (only on Planning / RoundSummary):
    case 'PreRoundMood':
      return null;
    case 'PostRoundReaction':
      return null;
    // DisparageCameo is handled before formatEventCard is called (routes to DisparageCard).
    // DisparageColumn is not rendered on Action.
    case 'DisparageCameo':
      return null;
    case 'DisparageColumn':
      return null;
  }
}
