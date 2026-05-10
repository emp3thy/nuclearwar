import type { GameState, LeaderId, Order, Yield } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { wasAttackedBy } from './scoring';
import { AI_SCORING_WEIGHTS } from '../balance';

/**
 * Mileigh-hem — Glass cannon personality.
 *
 * Two modes gated by an activation trigger:
 *
 * Activation trigger: me.apBanked + me.ap >= mileighActivationApThreshold (4).
 *
 * All-out mode (activated):
 *   Pair every available missile/bomber + warhead into launches, largest warhead first
 *   (greedy yield order: large → medium → small). Targets are leaders who attacked or
 *   propagandised him (approximated via wasAttackedBy; see note below). Skips defences.
 *
 * Diplomatic mode (otherwise):
 *   Emit up to 2 woo orders and up to 2 propaganda orders at attackers/propagandisers.
 *   Skips defences entirely.
 *
 * Note on propaganda-received tracking: the engine does not track "who propagandised me"
 * as a separate counter. For P2 we approximate propagandisers via wasAttackedBy
 * (grudge OR recentAggressionFrom), which captures most aggression. A dedicated
 * propagandaReceivedFrom counter is deferred to P4.
 */
export function planMileighHem(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const orders: Order[] = [];

  // Living non-self leaders.
  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);

  // Leaders who attacked or propagandised Mileigh-hem (P2 approximation via grudge/aggression).
  const targets = others.filter((t) => wasAttackedBy(state, leaderId, t));

  const totalAp = me.apBanked + me.ap;
  const activated = totalAp >= AI_SCORING_WEIGHTS.mileighActivationApThreshold;

  if (activated) {
    // --- All-out mode ---
    // Pair every available delivery vehicle + warhead, largest warhead first.
    // Targets: attackers first; if none, all others.
    const launchTargets = targets.length > 0 ? targets : others;

    // Build a pool of (delivery, warhead) pairs, greedily largest first.
    type Pair = { delivery: 'missile' | 'bomber'; warhead: Yield };
    const pairs: Pair[] = [];

    // Track available stockpile counts (we consume logically to avoid double-pairing).
    let missiles = me.stockpile.missiles;
    let bombers = me.stockpile.bombers;
    let large = me.stockpile.warheadsLarge;
    let medium = me.stockpile.warheadsMedium;
    let small = me.stockpile.warheadsSmall;

    // Yield priority: large → medium → small.
    const yieldPriority: Yield[] = ['large', 'medium', 'small'];

    while (missiles + bombers > 0) {
      // Pick the largest available warhead.
      let selectedWarhead: Yield | null = null;
      for (const y of yieldPriority) {
        if (y === 'large' && large > 0) { selectedWarhead = 'large'; large--; break; }
        if (y === 'medium' && medium > 0) { selectedWarhead = 'medium'; medium--; break; }
        if (y === 'small' && small > 0) { selectedWarhead = 'small'; small--; break; }
      }
      if (selectedWarhead === null) break; // no warheads left

      // Pick delivery: prefer missile, fall back to bomber.
      let delivery: 'missile' | 'bomber';
      if (missiles > 0) {
        delivery = 'missile';
        missiles--;
      } else {
        delivery = 'bomber';
        bombers--;
      }

      pairs.push({ delivery, warhead: selectedWarhead });
    }

    // Emit launch orders, cycling through launchTargets.
    let budget = me.ap;
    for (let i = 0; i < pairs.length; i++) {
      const { delivery, warhead } = pairs[i];
      const target = launchTargets[i % launchTargets.length];
      if (!target) break;
      if (budget < 2) break; // launch costs 2 AP

      const launch: Order = {
        kind: 'launch',
        target,
        delivery,
        warhead,
        targetType: 'people',
      };
      if (validateOrder(state, leaderId, launch).ok) {
        orders.push(launch);
        budget -= apCostOf(launch);
      }
    }
  } else {
    // --- Diplomatic mode ---
    let budget = me.ap;

    const WOO_COST = 1; // 1 AP per point; emit 1-point woo orders
    const PROPAGANDA_COST = 1;

    // Woo up to 2 leaders (targeting attackers first, then others if budget allows).
    // Woo targets: use targets (attackers) if present, else all others.
    const wooPool = targets.length > 0 ? targets : others;
    let wooCount = 0;
    for (const t of wooPool) {
      if (wooCount >= 2) break;
      if (budget < WOO_COST) break;
      const woo: Order = { kind: 'woo', target: t, points: 1 };
      if (validateOrder(state, leaderId, woo).ok) {
        orders.push(woo);
        budget -= apCostOf(woo);
        wooCount++;
      }
    }

    // Propaganda at attackers (up to 2 orders).
    let propCount = 0;
    for (const t of targets) {
      if (propCount >= 2) break;
      if (budget < PROPAGANDA_COST) break;
      const prop: Order = { kind: 'propaganda', target: t };
      if (validateOrder(state, leaderId, prop).ok) {
        orders.push(prop);
        budget -= apCostOf(prop);
        propCount++;
      }
    }
  }

  return orders;
}
