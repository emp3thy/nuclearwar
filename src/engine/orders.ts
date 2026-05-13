import type { GameState, LeaderId, Order, SoftWarning, Stockpile, Yield } from './types';
import { ACTION_COSTS } from './balance';
import { warheadFieldFor } from './launches';

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function apCostOf(o: Order): number {
  switch (o.kind) {
    case 'build-factory':
      return ACTION_COSTS.buildFactory;
    case 'build-missile':
      return ACTION_COSTS.buildMissile;
    case 'build-bomber':
      return ACTION_COSTS.buildBomber;
    case 'build-warhead':
      return warheadCost(o.yield);
    case 'build-defence':
      return ACTION_COSTS.buildDefence;
    case 'launch':
      return ACTION_COSTS.launch;
    case 'propaganda':
      return ACTION_COSTS.propaganda;
    case 'woo':
      return ACTION_COSTS.woo;
    case 'deploy-defence':
      return ACTION_COSTS.deployDefence;
  }
}

function warheadCost(y: Yield): number {
  switch (y) {
    case 'small':
      return ACTION_COSTS.buildWarheadSmall;
    case 'medium':
      return ACTION_COSTS.buildWarheadMedium;
    case 'large':
      return ACTION_COSTS.buildWarheadLarge;
  }
}

export function totalApCost(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + apCostOf(o), 0);
}

export function validateOrder(
  state: GameState,
  leaderId: LeaderId,
  o: Order,
): ValidationResult {
  const me = state.leaders[leaderId];
  if (!me) return { ok: false, reason: 'unknown-leader' };
  if (!me.alive) return { ok: false, reason: 'dead-leader' };

  switch (o.kind) {
    case 'build-factory':
    case 'build-missile':
    case 'build-bomber':
    case 'build-warhead':
    case 'build-defence':
      return { ok: true };

    case 'launch': {
      if (o.target === leaderId) return { ok: false, reason: 'self-target' };
      const target = state.leaders[o.target];
      if (!target || !target.alive) return { ok: false, reason: 'invalid-target' };
      if (o.delivery === 'missile' && me.stockpile.missiles < 1) {
        return { ok: false, reason: 'no-missile' };
      }
      if (o.delivery === 'bomber' && me.stockpile.bombers < 1) {
        return { ok: false, reason: 'no-bomber' };
      }
      if (warheadStock(me.stockpile, o.warhead) < 1) {
        return { ok: false, reason: 'no-warhead' };
      }
      return { ok: true };
    }

    case 'propaganda': {
      if (o.target === leaderId) return { ok: false, reason: 'self-target' };
      const t = state.leaders[o.target];
      if (!t || !t.alive) return { ok: false, reason: 'invalid-target' };
      return { ok: true };
    }

    case 'woo': {
      if (o.target === leaderId) return { ok: false, reason: 'self-target' };
      const t = state.leaders[o.target];
      if (!t || !t.alive) return { ok: false, reason: 'invalid-target' };
      return { ok: true };
    }

    case 'deploy-defence': {
      if (o.type === 'shield' && me.stockpile.shields < 1) {
        return { ok: false, reason: 'no-shield-to-deploy' };
      }
      if (o.type === 'aa' && me.stockpile.aa < 1) {
        return { ok: false, reason: 'no-aa-to-deploy' };
      }
      return { ok: true };
    }
  }
}

function warheadStock(s: Stockpile, y: Yield): number {
  switch (y) {
    case 'small':
      return s.warheadsSmall;
    case 'medium':
      return s.warheadsMedium;
    case 'large':
      return s.warheadsLarge;
  }
}

export type SequenceValidation =
  | { ok: true }
  | { ok: false; reason: string; orderIndex: number };

/**
 * Validate a SEQUENCE of orders against a leader's state, projecting stockpile
 * mutations from builds, deploys, and launches in the same sequence. Also
 * enforces one-woo-per-target and one-propaganda-per-target rules.
 * Mirrors the per-order loop in reducer.ts's SUBMIT_ORDERS case; extracted so
 * UI can validate the full queue without duplicating the projection logic.
 */
export function validateOrderSequence(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): SequenceValidation {
  let projected: GameState = state;
  const wooed = new Set<LeaderId>();
  const propagandised = new Set<LeaderId>();

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];

    // One-woo-per-target rule
    if (o.kind === 'woo') {
      if (wooed.has(o.target)) {
        return { ok: false, reason: 'woo-already-targeted', orderIndex: i };
      }
      wooed.add(o.target);
    }
    // One-propaganda-per-target rule
    if (o.kind === 'propaganda') {
      if (propagandised.has(o.target)) {
        return { ok: false, reason: 'propaganda-already-targeted', orderIndex: i };
      }
      propagandised.add(o.target);
    }

    const v = validateOrder(projected, leaderId, o);
    if (!v.ok) return { ok: false, reason: v.reason, orderIndex: i };

    // Project mutation per order kind
    projected = structuredClone(projected);
    const pl = projected.leaders[leaderId];
    switch (o.kind) {
      case 'build-missile':
        pl.stockpile.missiles += 1;
        break;
      case 'build-bomber':
        pl.stockpile.bombers += 1;
        break;
      case 'build-warhead':
        pl.stockpile[warheadFieldFor(o.yield)] += 1;
        break;
      case 'build-defence':
        if (o.type === 'shield') pl.stockpile.shields += 1;
        else pl.stockpile.aa += 1;
        break;
      case 'deploy-defence':
        if (o.type === 'shield') pl.stockpile.shields -= 1;
        else pl.stockpile.aa -= 1;
        break;
      case 'launch':
        if (o.delivery === 'missile') pl.stockpile.missiles -= 1;
        else pl.stockpile.bombers -= 1;
        pl.stockpile[warheadFieldFor(o.warhead)] -= 1;
        break;
      // build-factory / propaganda / woo: no stockpile mutation
      default:
        break;
    }
  }
  return { ok: true };
}

/**
 * Emit non-blocking advisory warnings for an order sequence. Same per-order
 * projection logic as validateOrderSequence; returns empty array for a clean plan.
 */
export function analyseOrderSequence(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): SoftWarning[] {
  const warnings: SoftWarning[] = [];
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return warnings;

  // Project stockpile + queued builds across the sequence.
  let missiles = me.stockpile.missiles;
  let bombers = me.stockpile.bombers;
  let warheads = me.stockpile.warheadsSmall + me.stockpile.warheadsMedium + me.stockpile.warheadsLarge;

  // Pre-scan: count delivery+warhead builds in the queue so each order can
  // ask "is there any delivery/warhead in this sequence (already owned + queued)?"
  let queuedDeliveries = 0;
  let queuedWarheads = 0;
  for (const o of orders) {
    if (o.kind === 'build-missile' || o.kind === 'build-bomber') queuedDeliveries++;
    if (o.kind === 'build-warhead') queuedWarheads++;
  }
  const ownedOrQueuedDeliveries = missiles + bombers + queuedDeliveries;
  const ownedOrQueuedWarheads = warheads + queuedWarheads;

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];

    if (o.kind === 'build-warhead') {
      if (ownedOrQueuedDeliveries === 0) {
        warnings.push({ kind: 'warhead-no-delivery', orderIndex: i });
      }
    }

    if (o.kind === 'build-missile' || o.kind === 'build-bomber') {
      if (ownedOrQueuedWarheads === 0) {
        warnings.push({ kind: 'delivery-no-warhead', orderIndex: i });
      }
    }

    if (o.kind === 'woo') {
      const target = state.leaders[o.target];
      if (!target) continue;
      const aggression = target.recentAggressionFrom[leaderId] ?? 0;
      const fav = target.favourability[leaderId] ?? 0;
      if (aggression === 0 && fav >= 0) {
        warnings.push({ kind: 'woo-non-attacker', orderIndex: i, target: o.target });
      }
    }

    // Project launch consumption (mirrors validateOrderSequence; cheap copy).
    if (o.kind === 'launch') {
      if (o.delivery === 'missile' && missiles > 0) missiles -= 1;
      else if (o.delivery === 'bomber' && bombers > 0) bombers -= 1;
      if (warheads > 0) warheads -= 1;
    }
  }

  return warnings;
}
