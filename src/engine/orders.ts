import type { GameState, LeaderId, Order, Stockpile, Yield } from './types';
import { ACTION_COSTS } from './balance';

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
      return ACTION_COSTS.wooPerPoint * o.points;
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
      if (o.points < 1) return { ok: false, reason: 'non-positive-points' };
      const t = state.leaders[o.target];
      if (!t || !t.alive) return { ok: false, reason: 'invalid-target' };
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
