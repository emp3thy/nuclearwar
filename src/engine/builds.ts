import type { GameState, LeaderId, Order, ResolutionEvent } from './types';

export interface BuildsResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function applyDefenceBuilds(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): BuildsResult {
  const next: GameState = structuredClone(state);
  const leader = next.leaders[leaderId];
  const events: ResolutionEvent[] = [];

  // Stage 1: all build-defence orders first (stockpile += 1)
  for (const o of orders) {
    if (o.kind !== 'build-defence') continue;
    if (o.type === 'shield') leader.stockpile.shields += 1;
    else leader.stockpile.aa += 1;
    events.push({ kind: 'DefenceBuilt', by: leaderId, type: o.type });
  }

  // Stage 2: all deploy-defence orders second (stockpile -= 1, deployed += 1)
  for (const o of orders) {
    if (o.kind !== 'deploy-defence') continue;
    if (o.type === 'shield') {
      if (leader.stockpile.shields < 1) continue; // defensive — validateOrder should have caught
      leader.stockpile.shields -= 1;
      leader.deployedShields += 1;
    } else {
      if (leader.stockpile.aa < 1) continue;
      leader.stockpile.aa -= 1;
      leader.deployedAA += 1;
    }
    events.push({ kind: 'DefenceDeployed', by: leaderId, type: o.type });
  }

  return { state: next, events };
}

export function applyOtherBuilds(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): BuildsResult {
  const next: GameState = structuredClone(state);
  const leader = next.leaders[leaderId];
  const events: ResolutionEvent[] = [];
  for (const o of orders) {
    switch (o.kind) {
      case 'build-factory':
        leader.factories += 1;
        events.push({ kind: 'FactoryBuilt', by: leaderId });
        break;
      case 'build-missile':
        leader.stockpile.missiles += 1;
        events.push({ kind: 'DeliveryBuilt', by: leaderId, type: 'missile' });
        break;
      case 'build-bomber':
        leader.stockpile.bombers += 1;
        events.push({ kind: 'DeliveryBuilt', by: leaderId, type: 'bomber' });
        break;
      case 'build-warhead':
        if (o.yield === 'small') leader.stockpile.warheadsSmall += 1;
        else if (o.yield === 'medium') leader.stockpile.warheadsMedium += 1;
        else leader.stockpile.warheadsLarge += 1;
        events.push({ kind: 'WarheadBuilt', by: leaderId, yield: o.yield });
        break;
      // build-defence handled in applyDefenceBuilds
      // launch / propaganda / woo handled in their own phases
      default:
        break;
    }
  }
  return { state: next, events };
}
