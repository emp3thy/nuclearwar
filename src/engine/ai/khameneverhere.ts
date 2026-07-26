import type { GameState, LeaderId, Order } from '../types';
import { topGrudgeTarget } from './scoring';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Khameneverhere — Grudge personality, vengeance-goes-large doctrine (slice 1).
 *
 * Very aggressive, launch-focused. Ranks targets by grudge (top grudge first,
 * then remaining living leaders). Launch-first uncapped salvo, then build the
 * remainder toward a raised stockpile. Large is front-loaded among warheads
 * (right after delivery) so his grudge strikes land large when AP allows;
 * medium and small are fallback yields so he is never disarmed. No diplomacy.
 */
const KHAMENEVERHERE_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 5 },
  { build: { item: 'warhead', yield: 'large' }, target: 2 },
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
  { build: { item: 'warhead', yield: 'small' }, target: 2 },
];

export function planKhameneverhere(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);

  // Rank: top grudge target first, then the remaining living leaders.
  const top = topGrudgeTarget(state, leaderId);
  const rankedTargets: LeaderId[] =
    top !== null && others.includes(top)
      ? [top, ...others.filter((t) => t !== top)]
      : [...others];

  // Launch first (uncapped), then build with the remainder.
  const salvo = launchSalvo(state, leaderId, { budget: me.ap, rankedTargets });
  const build = buildToward(
    state, leaderId, KHAMENEVERHERE_BUILD_PLAN, me.ap - salvo.apSpent,
  );

  // Builds precede launches in the submitted array.
  return [...build.orders, ...salvo.orders];
}
