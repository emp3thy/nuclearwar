import type { GameState, LeaderId, Order, ResolutionEvent } from './types';
import { WOO_FAVOURABILITY_DECAY, ACTION_COSTS } from './balance';

export interface WooingResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function applyWooing(
  state: GameState,
  ordersByLeader: Partial<Record<LeaderId, Order[]>>,
): WooingResult {
  const next: GameState = structuredClone(state);
  const events: ResolutionEvent[] = [];
  const senders = Object.keys(ordersByLeader).sort() as LeaderId[];
  for (const id of senders) {
    const orders = ordersByLeader[id] ?? [];
    for (const o of orders) {
      if (o.kind !== 'woo') continue;
      const me = next.leaders[id];
      const target = next.leaders[o.target];
      if (!me || !me.alive || !target || !target.alive) continue;
      const current = target.favourability[id] ?? 0;
      const points = ACTION_COSTS.woo;
      target.favourability[id] = current + points;
      events.push({ kind: 'WooApplied', from: id, to: o.target, points });
    }
  }
  return { state: next, events };
}

export function decayFavourability(state: GameState): GameState {
  const next: GameState = structuredClone(state);
  for (const id of next.cast) {
    const f = next.leaders[id].favourability;
    for (const k of Object.keys(f) as LeaderId[]) {
      const v = f[k] ?? 0;
      f[k] = Math.max(0, v - WOO_FAVOURABILITY_DECAY);
    }
  }
  return next;
}
