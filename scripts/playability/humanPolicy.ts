import type { GameState, LeaderId, Order } from '../../src/engine/types';
import { validateOrderSequence, totalApCost } from '../../src/engine/orders';

/**
 * A deterministic "casual but competent" human policy for the player1 slot.
 *
 * Design intent (documented so the playability study is interpretable): this is
 * a *measured reactive* human, not an optimiser and not a warmonger.
 *  - invests in economy early,
 *  - keeps a shield up once threatened,
 *  - always retaliates when hit (at the biggest grudge-holder),
 *  - finishes off a badly-wounded rival if one exists,
 *  - does NOT open with a first strike,
 *  - spends leftover AP on propaganda against attackers / occasional wooing,
 *  - banks whatever is left.
 *
 * Orders are emitted producers-before-consumers and each candidate is validated
 * against the growing sequence + remaining AP, so the returned list is always a
 * legal, affordable submission (the reducer would silently drop an illegal one).
 */
export function humanOrders(state: GameState, id: LeaderId = 'player1'): Order[] {
  const me = state.leaders[id];
  if (!me || !me.alive) return [];

  const budget = me.ap;
  const orders: Order[] = [];

  const tryAdd = (o: Order): boolean => {
    const candidate = [...orders, o];
    if (totalApCost(candidate) > budget) return false;
    if (!validateOrderSequence(state, id, candidate).ok) return false;
    orders.push(o);
    return true;
  };

  const others = state.cast.filter((t) => t !== id && state.leaders[t]?.alive);

  const attackers = others
    .filter((t) => (me.grudge[t] ?? 0) > 0)
    .sort((a, b) => (me.grudge[b] ?? 0) - (me.grudge[a] ?? 0));

  const threatened = attackers.length > 0;

  // 1. Early economy: invest in a factory in the opening rounds.
  if (state.round <= 2) tryAdd({ kind: 'build-factory' });

  // 2. Defence: keep a shield in the bank once the game turns hot.
  if ((threatened || state.round >= 3) && me.stockpile.shields === 0) {
    tryAdd({ kind: 'build-defence', type: 'shield' });
  }

  // 3. Arm a single launcher + warhead if we have neither (producers first).
  if (me.stockpile.missiles === 0) tryAdd({ kind: 'build-missile' });
  const hasWarhead =
    me.stockpile.warheadsSmall + me.stockpile.warheadsMedium + me.stockpile.warheadsLarge > 0;
  if (!hasWarhead) tryAdd({ kind: 'build-warhead', yield: 'small' });

  // 4. Offence: retaliate against the top attacker; otherwise finish a wounded
  //    rival (<=10M). Never open with a first strike.
  let target: LeaderId | undefined;
  if (threatened) {
    target = attackers[0];
  } else {
    const wounded = others
      .filter((t) => state.leaders[t].population <= 10)
      .sort((a, b) => state.leaders[a].population - state.leaders[b].population);
    if (wounded.length > 0) target = wounded[0];
  }
  if (target !== undefined) {
    tryAdd({ kind: 'launch', target, delivery: 'missile', warhead: 'small', targetType: 'people' });
  }

  // 5. Deploy a shield this round if threatened and one is available.
  if (threatened) tryAdd({ kind: 'deploy-defence', type: 'shield' });

  // 6. Propaganda against the worst attacker with leftover AP.
  if (attackers.length > 0) tryAdd({ kind: 'propaganda', target: attackers[0] });

  // 7. Occasional diplomacy: woo the strongest non-attacker every third round.
  if (state.round % 3 === 0) {
    const friendlyCandidates = others
      .filter((t) => (me.grudge[t] ?? 0) === 0)
      .sort((a, b) => state.leaders[b].population - state.leaders[a].population);
    if (friendlyCandidates.length > 0) tryAdd({ kind: 'woo', target: friendlyCandidates[0] });
  }

  // 8. Bank the rest (no order needed).
  return orders;
}
