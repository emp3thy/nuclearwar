import type { GameState, LeaderId, Order } from '../../src/engine/types';
import { totalApCost, validateOrder } from '../../src/engine/orders';

// Deterministic order picker: each round, each leader cycles through a fixed
// build/launch pattern keyed on (round, leader). Always respects AP budget and
// drops invalid orders.
export function scriptedOrders(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];
  const target = state.cast.find((id) => id !== leaderId && state.leaders[id].alive);
  const patterns: Order[][] = [
    [{ kind: 'build-missile' }, { kind: 'build-warhead', yield: 'small' }],
    [{ kind: 'build-factory' }],
    [{ kind: 'build-defence', type: 'shield' }],
    target
      ? [
          {
            kind: 'launch',
            target,
            delivery: 'missile',
            warhead: 'small',
            targetType: 'people',
          },
        ]
      : [],
    target
      ? [{ kind: 'propaganda', target }]
      : [],
    target
      ? [{ kind: 'woo', target, points: 1 }]
      : [],
  ];

  const idx = (state.round + leaderHash(leaderId)) % patterns.length;
  const candidate = patterns[idx];
  // Drop orders that fail validation in the current state, and trim to AP.
  const filtered: Order[] = [];
  for (const o of candidate) {
    if (!validateOrder(state, leaderId, o).ok) continue;
    if (totalApCost([...filtered, o]) > me.ap) break;
    filtered.push(o);
  }
  return filtered;
}

function leaderHash(id: LeaderId): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
