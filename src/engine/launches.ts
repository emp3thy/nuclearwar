import type {
  GameState,
  Launch,
  LeaderId,
  Order,
  ResolutionEvent,
  Yield,
} from './types';
import { factoriesDestroyed, interceptProbability, peopleDeaths } from './combat';
import { nextRandom } from './rng';

export type IncomingCounter = Record<LeaderId, { missile: number; bomber: number }>;

export function makeIncomingCounter(cast: LeaderId[]): IncomingCounter {
  const c: IncomingCounter = {} as IncomingCounter;
  for (const id of cast) c[id] = { missile: 0, bomber: 0 };
  return c;
}

export interface LaunchesResult {
  state: GameState;
  events: ResolutionEvent[];
  incoming: IncomingCounter;
}

/**
 * Pure: walk orders in attacker-id-ASC order and emit a Launch[]. Does no
 * validation — bad targets and missing stock are filtered by `consumeStockFor`.
 */
export function collectLaunches(
  ordersByLeader: Partial<Record<LeaderId, Order[]>>,
): Launch[] {
  const launches: Launch[] = [];
  const attackers = Object.keys(ordersByLeader).sort() as LeaderId[];
  for (const id of attackers) {
    for (const o of ordersByLeader[id] ?? []) {
      if (o.kind !== 'launch') continue;
      launches.push({
        from: id,
        to: o.target,
        delivery: o.delivery,
        warhead: o.warhead,
        targetType: o.targetType,
      });
    }
  }
  return launches;
}

/**
 * Validates each launch against current state (attacker + receiver alive,
 * stock available) and consumes the delivery + warhead from valid attackers.
 * Returns the mutated state and the filtered Launch[] ready for `applyLaunches`.
 *
 * Used by the regular launch phase. Final Retaliation has its own consumption
 * loop because it pairs warheads with deliveries algorithmically.
 */
export function consumeStockFor(
  state: GameState,
  launches: Launch[],
): { state: GameState; validLaunches: Launch[] } {
  const next: GameState = structuredClone(state);
  const valid: Launch[] = [];
  for (const l of launches) {
    const attacker = next.leaders[l.from];
    const receiver = next.leaders[l.to];
    if (!attacker || !attacker.alive) continue;
    if (!receiver || !receiver.alive) continue;
    if (l.delivery === 'missile' && attacker.stockpile.missiles < 1) continue;
    if (l.delivery === 'bomber' && attacker.stockpile.bombers < 1) continue;
    const wf = warheadFieldFor(l.warhead);
    if (attacker.stockpile[wf] < 1) continue;

    if (l.delivery === 'missile') attacker.stockpile.missiles -= 1;
    else attacker.stockpile.bombers -= 1;
    attacker.stockpile[wf] -= 1;
    valid.push(l);
  }
  return { state: next, validLaunches: valid };
}

/**
 * Resolves intercept rolls and applies damage for an already-validated,
 * already-stock-consumed Launch[]. Does NOT touch attacker stock and does NOT
 * gate on attacker.alive — Final Retaliation fires from a dead leader, and we
 * still want those launches to resolve.
 *
 * Receiver still must be alive: dead-target launches collapse into a no-op.
 */
export function applyLaunches(
  state: GameState,
  launches: Launch[],
  incoming?: IncomingCounter,
): LaunchesResult {
  const next: GameState = structuredClone(state);
  const events: ResolutionEvent[] = [];
  // Thread the counter across calls so the Nth-incoming tally is round-scoped,
  // not per-call. Clone the provided counter so callers can diff old vs new.
  const counter: IncomingCounter = incoming
    ? structuredClone(incoming)
    : makeIncomingCounter(next.cast);

  for (const l of launches) {
    const receiver = next.leaders[l.to];
    if (!receiver || !receiver.alive) continue;

    events.push({
      kind: 'MissileLaunched',
      from: l.from,
      to: l.to,
      delivery: l.delivery,
      warhead: l.warhead,
      targetType: l.targetType,
    });

    counter[l.to][l.delivery] += 1;
    const nth = counter[l.to][l.delivery];
    const defenders = l.delivery === 'missile' ? receiver.deployedShields : receiver.deployedAA;
    const p = interceptProbability(nth, defenders);
    const roll = nextRandom(next.rngState);
    next.rngState = roll.state;
    if (roll.value < p) {
      if (l.delivery === 'missile') receiver.deployedShields = Math.max(0, receiver.deployedShields - 1);
      else receiver.deployedAA = Math.max(0, receiver.deployedAA - 1);
      events.push({
        kind: 'MissileIntercepted',
        from: l.from,
        to: l.to,
        delivery: l.delivery,
        warhead: l.warhead,
      });
      continue;
    }

    if (l.targetType === 'people') {
      const deaths = peopleDeaths(l.warhead, receiver.population);
      receiver.population -= deaths;
      events.push({
        kind: 'ImpactPeople',
        from: l.from,
        target: l.to,
        warhead: l.warhead,
        deaths,
      });
      // P4c.1: bomber is reusable — restore on impact (lost only on intercept).
      if (l.delivery === 'bomber') {
        const attacker = next.leaders[l.from];
        if (attacker) attacker.stockpile.bombers += 1;
      }
    } else {
      const destroyed = factoriesDestroyed(l.warhead, receiver.factories);
      receiver.factories -= destroyed;
      events.push({
        kind: 'ImpactInfrastructure',
        from: l.from,
        target: l.to,
        warhead: l.warhead,
        factoriesDestroyed: destroyed,
      });
      // P4c.1: bomber is reusable — restore on impact (lost only on intercept).
      if (l.delivery === 'bomber') {
        const attacker = next.leaders[l.from];
        if (attacker) attacker.stockpile.bombers += 1;
      }
    }
  }

  return { state: next, events, incoming: counter };
}

export function warheadFieldFor(y: Yield): 'warheadsSmall' | 'warheadsMedium' | 'warheadsLarge' {
  if (y === 'small') return 'warheadsSmall';
  if (y === 'medium') return 'warheadsMedium';
  return 'warheadsLarge';
}
