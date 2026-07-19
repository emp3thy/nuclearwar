import type { GameState, ResolutionEvent } from '../../engine/types';

export interface EventText {
  icon: string;
  body: string;
  quote?: string;
}

function flag(game: GameState, id: keyof GameState['leaders']): string {
  return game.leaders[id]?.country.split(' ')[0] ?? id;
}
function name(game: GameState, id: keyof GameState['leaders']): string {
  return game.leaders[id]?.name ?? id;
}

/**
 * Per-kind display text for a resolution event (icon + body + merged quote).
 * Moved verbatim from EventCard's formatEventCard (slice-3 re-theme) minus the
 * className field. Returns null for kinds never rendered on the Action screen.
 */
export function formatEventText(
  event: ResolutionEvent,
  game: GameState,
  count = 1,
): EventText | null {
  switch (event.kind) {
    case 'OrdersSealed':
      return null;  // not rendered
    case 'FactoryBuilt':
      return {
        icon: '⚙',
        body: `${flag(game, event.by)} ${name(game, event.by)} builds ${count} ${count === 1 ? 'factory' : 'factories'}`,
        quote: event.quote,
      };
    case 'DeliveryBuilt':
      return {
        icon: event.type === 'missile' ? '🚀' : '🛩',
        body: `${flag(game, event.by)} ${name(game, event.by)} builds ${count} ${event.type}${count === 1 ? '' : 's'}`,
      };
    case 'WarheadBuilt':
      return {
        icon: '☢',
        body: `${flag(game, event.by)} ${name(game, event.by)} builds ${count} ${event.yield} warhead${count === 1 ? '' : 's'}`,
      };
    case 'DefenceBuilt':
      return {
        icon: '🛡',
        body: `${flag(game, event.by)} ${name(game, event.by)} builds ${count} ${event.type === 'shield' ? (count === 1 ? 'shield' : 'shields') : 'AA'}`,
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
        quote: event.quote,
      };
    case 'DefenceDeployed':
      return {
        icon: '🛡',
        body: `${flag(game, event.by)} ${name(game, event.by)} deploys ${event.type === 'shield' ? 'a shield' : 'AA'}`,
        quote: event.quote,
      };
    case 'DefenceConsumed':
      return null;  // round-end housekeeping, not rendered on Action
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
    // DisparageCameo renders as the cameo overlay card, not banner text.
    // DisparageColumn is not rendered on Action.
    case 'DisparageCameo':
      return null;
    case 'DisparageColumn':
      return null;
  }
}
