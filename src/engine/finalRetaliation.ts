import type {
  DeliveryType,
  GameState,
  Launch,
  LeaderId,
  ResolutionEvent,
  Yield,
} from './types';
import { applyLaunches, makeIncomingCounter, warheadFieldFor } from './launches';
import type { IncomingCounter } from './launches';
import { nextInt, nextRandom } from './rng';

export interface FinalRetaliationResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function applyFinalRetaliation(
  state: GameState,
  newlyDead: LeaderId[],
  incoming?: IncomingCounter,
): FinalRetaliationResult {
  let next: GameState = structuredClone(state);
  const events: ResolutionEvent[] = [];
  const queue = [...newlyDead];
  const fired = new Set<LeaderId>();
  // Thread the round-scoped Nth-incoming counter through every FR applyLaunches
  // call so defenders can't absorb more missiles than spec §6 allows.
  let counter: IncomingCounter = incoming
    ? structuredClone(incoming)
    : makeIncomingCounter(next.cast);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (fired.has(id)) continue;
    fired.add(id);

    const leader = next.leaders[id];
    if (!leader) continue;
    const survivors = next.cast.filter(
      (other) => other !== id && next.leaders[other].alive,
    );
    if (survivors.length === 0) break;

    // Synthesise + consume in one pass: largest warhead first, paired with the
    // cheapest available delivery (missile preferred). Stock is consumed here,
    // not by applyLaunches — the refactored applyLaunches assumes pre-consumed
    // launches, which lets us hand off without a push-back kludge.
    const synthesised: Launch[] = [];
    const yields: Yield[] = ['large', 'medium', 'small'];
    for (const y of yields) {
      const wf = warheadFieldFor(y);
      while (leader.stockpile[wf] > 0) {
        let delivery: DeliveryType | null = null;
        if (leader.stockpile.missiles > 0) delivery = 'missile';
        else if (leader.stockpile.bombers > 0) delivery = 'bomber';
        if (!delivery) break;

        if (delivery === 'missile') leader.stockpile.missiles -= 1;
        else leader.stockpile.bombers -= 1;
        leader.stockpile[wf] -= 1;

        // Weighted by grudge if non-empty, else uniform.
        const grudge = leader.grudge;
        const weights = survivors.map((s) => Math.max(0, grudge[s] ?? 0));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let target: LeaderId;
        if (totalWeight > 0) {
          // Weighted draw: pick a value in [0, totalWeight) and walk cumulative weights.
          const draw = nextRandom(next.rngState);
          next.rngState = draw.state;
          let cumulative = 0;
          const threshold = draw.value * totalWeight;
          target = survivors[0];
          for (let i = 0; i < survivors.length; i++) {
            cumulative += weights[i];
            if (cumulative >= threshold) {
              target = survivors[i];
              break;
            }
          }
        } else {
          // Uniform fallback.
          const pick = nextInt(next.rngState, survivors.length);
          next.rngState = pick.state;
          target = survivors[pick.value];
        }

        synthesised.push({
          from: id,
          to: target,
          delivery,
          warhead: y,
          targetType: 'people',
        });
      }
    }

    if (synthesised.length === 0) continue;
    events.push({
      kind: 'FinalRetaliationTriggered',
      by: id,
      targets: synthesised.map((l) => l.to),
    });

    // Stock is already consumed; applyLaunches just rolls intercepts + damage.
    // Pass and update the round-scoped counter so Nth-incoming accumulates
    // correctly across cascade firings.
    const lr = applyLaunches(next, synthesised, counter);
    next = lr.state;
    counter = lr.incoming;
    events.push(...lr.events);

    // Cascade: any leader newly killed by this FR enters the queue.
    for (const other of next.cast) {
      const ol = next.leaders[other];
      if (ol.alive && ol.population <= 0) {
        ol.alive = false;
        ol.population = 0;
        events.push({ kind: 'LeaderEliminated', id: other });
        if (!fired.has(other)) queue.push(other);
      }
    }
  }

  return { state: next, events };
}
