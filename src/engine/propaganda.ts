import type { GameState, LeaderId, Order, ResolutionEvent } from './types';
import { PROPAGANDA_TRANSFER_M } from './balance';

export interface PropagandaResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function applyPropaganda(
  state: GameState,
  ordersByLeader: Partial<Record<LeaderId, Order[]>>,
): PropagandaResult {
  const next: GameState = structuredClone(state);
  const events: ResolutionEvent[] = [];
  const propagandists = Object.keys(ordersByLeader).sort() as LeaderId[];
  for (const id of propagandists) {
    const orders = ordersByLeader[id] ?? [];
    for (const o of orders) {
      if (o.kind !== 'propaganda') continue;
      const me = next.leaders[id];
      const target = next.leaders[o.target];
      if (!me || !me.alive || !target || !target.alive) continue;
      const amount = Math.min(PROPAGANDA_TRANSFER_M, target.population);
      if (amount <= 0) continue;
      target.population -= amount;
      me.population += amount;
      events.push({ kind: 'PropagandaTransfer', from: id, to: o.target, amount });
    }
  }
  return { state: next, events };
}
