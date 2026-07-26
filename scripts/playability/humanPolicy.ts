import type { GameState, LeaderId, Order } from '../../src/engine/types';
import { validateOrderSequence, totalApCost } from '../../src/engine/orders';

export type PolicyName = 'cautious' | 'aggressive' | 'balanced' | 'turtle';

type Adder = (o: Order) => boolean;

/** Greedy add-if-legal helper shared by all policies. */
function adder(state: GameState, id: LeaderId, budget: number, orders: Order[]): Adder {
  return (o: Order): boolean => {
    const candidate = [...orders, o];
    if (totalApCost(candidate) > budget) return false;
    if (!validateOrderSequence(state, id, candidate).ok) return false;
    orders.push(o);
    return true;
  };
}

function aliveOthers(state: GameState, id: LeaderId): LeaderId[] {
  return state.cast.filter((t) => t !== id && state.leaders[t]?.alive);
}

/**
 * Shared assumption (per design): once someone lands a hit on you, you defend
 * and retaliate at the attacker, escalating toward eliminating them when it is
 * a *reasonable* fight (they are finishable or not vastly stronger than you).
 * Returns true if the player was under attack this round.
 *
 * `maxRetal` caps retaliatory launches (cautious keeps it low, balanced higher).
 * Builds a missile+warhead on the fly when stock is short (producers-first,
 * validated by the sequence checker).
 */
function respondToAttackers(
  state: GameState,
  id: LeaderId,
  tryAdd: Adder,
  maxRetal: number,
): boolean {
  const me = state.leaders[id];
  const others = aliveOthers(state, id);
  const attackers = others
    .filter((t) => (me.grudge[t] ?? 0) > 0)
    .sort((a, b) => (me.grudge[b] ?? 0) - (me.grudge[a] ?? 0));
  if (attackers.length === 0) return false;

  // Defend first: deploy whatever interceptors are in stock.
  tryAdd({ kind: 'deploy-defence', type: 'shield' });
  tryAdd({ kind: 'deploy-defence', type: 'aa' });

  const primary = attackers[0];
  const atk = state.leaders[primary];
  // "Reasonable attack": worth chasing elimination if the attacker is
  // finishable or not far stronger than us. Otherwise a single warning shot.
  const reasonable = atk.population <= 12 || atk.population <= me.population * 1.5;
  const toFinish = Math.ceil(atk.population / 2); // small warhead ≈ 2 pop damage
  const want = reasonable ? Math.min(toFinish, maxRetal) : 1;

  let fired = 0;
  let guard = 0;
  while (fired < want && guard < 12) {
    guard++;
    const launch: Order = {
      kind: 'launch', target: primary, delivery: 'missile', warhead: 'small', targetType: 'people',
    };
    if (tryAdd(launch)) {
      fired++;
      continue;
    }
    // Out of ammo — build a missile + warhead, then try again next iteration.
    const b1 = tryAdd({ kind: 'build-missile' });
    const b2 = tryAdd({ kind: 'build-warhead', yield: 'small' });
    if (!b1 && !b2) break; // no AP left to arm
  }
  return true;
}

/**
 * CAUTIOUS — measured reactive: invests early, keeps a shield, defends and
 * retaliates when hit (low escalation), finishes a wounded rival, never opens
 * with a first strike, otherwise diplomacy + banking.
 */
export function cautious(state: GameState, id: LeaderId = 'player1'): Order[] {
  const me = state.leaders[id];
  if (!me || !me.alive) return [];
  const orders: Order[] = [];
  const tryAdd = adder(state, id, me.ap, orders);
  const others = aliveOthers(state, id);

  if (state.round <= 2) tryAdd({ kind: 'build-factory' });
  if (me.stockpile.shields === 0) tryAdd({ kind: 'build-defence', type: 'shield' });

  const attacked = respondToAttackers(state, id, tryAdd, 2);

  if (!attacked) {
    // No first strike — only finish an already-wounded rival.
    const wounded = others
      .filter((t) => state.leaders[t].population <= 10)
      .sort((a, b) => state.leaders[a].population - state.leaders[b].population);
    if (wounded.length > 0) {
      const target = wounded[0];
      if (!tryAdd({ kind: 'launch', target, delivery: 'missile', warhead: 'small', targetType: 'people' })) {
        tryAdd({ kind: 'build-missile' });
        tryAdd({ kind: 'build-warhead', yield: 'small' });
        tryAdd({ kind: 'launch', target, delivery: 'missile', warhead: 'small', targetType: 'people' });
      }
    }
    if (state.round % 3 === 0) {
      const friendly = others
        .filter((t) => (me.grudge[t] ?? 0) === 0)
        .sort((a, b) => state.leaders[b].population - state.leaders[a].population);
      if (friendly.length > 0) tryAdd({ kind: 'woo', target: friendly[0] });
    }
  }
  return orders;
}

/**
 * BALANCED — economy + defence + measured offence. Retaliates hard when hit
 * (defends and pushes to eliminate a reasonable attacker), pre-empts by
 * finishing the weakest rival when unthreatened, but keeps investing rather
 * than going all-in.
 */
export function balanced(state: GameState, id: LeaderId = 'player1'): Order[] {
  const me = state.leaders[id];
  if (!me || !me.alive) return [];
  const orders: Order[] = [];
  const tryAdd = adder(state, id, me.ap, orders);
  const others = aliveOthers(state, id);

  // Economy + standing defence.
  if (state.round <= 3) tryAdd({ kind: 'build-factory' });
  if (me.stockpile.shields === 0) tryAdd({ kind: 'build-defence', type: 'shield' });

  const attacked = respondToAttackers(state, id, tryAdd, 4);

  if (!attacked) {
    // Unthreatened: opportunistically strike the weakest rival (pre-emptive but
    // not indiscriminate — only the most vulnerable, and only a measured salvo).
    const weakest = [...others].sort(
      (a, b) => state.leaders[a].population - state.leaders[b].population,
    )[0];
    if (weakest !== undefined) {
      let shots = 0;
      let guard = 0;
      while (shots < 2 && guard < 6) {
        guard++;
        const launch: Order = {
          kind: 'launch', target: weakest, delivery: 'missile', warhead: 'small', targetType: 'people',
        };
        if (tryAdd(launch)) { shots++; continue; }
        const b1 = tryAdd({ kind: 'build-missile' });
        const b2 = tryAdd({ kind: 'build-warhead', yield: 'small' });
        if (!b1 && !b2) break;
      }
    }
  }
  // Keep an extra warhead in reserve if AP remains.
  tryAdd({ kind: 'build-warhead', yield: 'small' });
  return orders;
}

/**
 * AGGRESSIVE (all-in) — opens with a first strike round 1 and unloads every
 * round: spends all AP building missile+small-warhead and firing at the
 * strongest surviving rival. No defence, no diplomacy.
 */
export function aggressive(state: GameState, id: LeaderId = 'player1'): Order[] {
  const me = state.leaders[id];
  if (!me || !me.alive) return [];
  const orders: Order[] = [];
  const tryAdd = adder(state, id, me.ap, orders);
  const others = aliveOthers(state, id);
  if (others.length === 0) return orders;

  if (state.round === 1) tryAdd({ kind: 'build-factory' });

  const target = others.reduce((best, t) =>
    state.leaders[t].population > state.leaders[best].population ? t : best,
  );

  let progressed = true;
  while (progressed) {
    progressed = false;
    if (tryAdd({ kind: 'build-missile' })) progressed = true;
    if (tryAdd({ kind: 'build-warhead', yield: 'small' })) progressed = true;
    if (tryAdd({ kind: 'launch', target, delivery: 'missile', warhead: 'small', targetType: 'people' })) {
      progressed = true;
    }
  }
  return orders;
}

/**
 * TURTLE — pure passive survival. Never launches; builds economy + stacks and
 * deploys defence. (Not part of the 3-human study; kept for the solo baseline.)
 */
export function turtle(state: GameState, id: LeaderId = 'player1'): Order[] {
  const me = state.leaders[id];
  if (!me || !me.alive) return [];
  const orders: Order[] = [];
  const tryAdd = adder(state, id, me.ap, orders);
  const others = aliveOthers(state, id);
  const threatened = others.some((t) => (me.grudge[t] ?? 0) > 0);

  if (state.round <= 3) tryAdd({ kind: 'build-factory' });
  tryAdd({ kind: 'build-defence', type: 'shield' });
  if (me.stockpile.shields >= 1 || threatened) tryAdd({ kind: 'deploy-defence', type: 'shield' });
  tryAdd({ kind: 'build-defence', type: 'aa' });
  if (me.stockpile.aa >= 1) tryAdd({ kind: 'deploy-defence', type: 'aa' });
  return orders;
}

export const POLICIES: Record<PolicyName, (state: GameState, id?: LeaderId) => Order[]> = {
  cautious,
  aggressive,
  balanced,
  turtle,
};

/** Back-compat default used by the original single-policy study. */
export const humanOrders = cautious;
