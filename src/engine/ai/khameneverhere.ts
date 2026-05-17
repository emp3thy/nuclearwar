import type { GameState, LeaderId, Order } from '../types';
import { topGrudgeTarget } from './scoring';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Khameneverhere — Grudge personality (P4c.2 rework).
 *
 * Very aggressive, launch-focused. Ranks targets by grudge (top grudge first,
 * then remaining living leaders). Launch-first uncapped salvo, then build the
 * remainder toward a raised stockpile with medium warheads. No diplomacy.
 */
const KHAMENEVERHERE_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 6 },
  { build: { item: 'warhead', yield: 'small' }, target: 4 },
  { build: { item: 'warhead', yield: 'medium' }, target: 3 },
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
