import type { GameState, LeaderId, Order, ResolutionEvent } from './types';
import { applyDefenceBuilds, applyOtherBuilds } from './builds';
import { applyPropaganda } from './propaganda';
import { applyWooing, decayFavourability } from './diplomacy';
import { applyLaunches, collectLaunches, consumeStockFor, makeIncomingCounter } from './launches';
import { applyFinalRetaliation } from './finalRetaliation';
import { checkOutcome } from './winConditions';
import { AP_BANK_CAP, FACTORY_AP_RATE, LEADER_PROFILES, AI_SCORING_WEIGHTS } from './balance';
import { getBank } from './flavor/index';
import { pickLine } from './flavor/pick';
import { isHuman } from './state';
import { shouldRollCameo, shouldRollColumn, pickColumnNamedLeader } from './cameo';
import { disparageBank } from './flavor/disparage';
import { nextInt } from './rng';

export interface ResolveResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function resolveRound(state: GameState): ResolveResult {
  const events: ResolutionEvent[] = [];
  let s: GameState = structuredClone(state);

  const startOfRoundPop: Partial<Record<LeaderId, number>> = {};
  for (const id of s.cast) startOfRoundPop[id] = s.leaders[id].population;

  // P4a: emit PreRoundMood per living non-human leader. Snap-back if Disparage's
  // column named this leader last round (and they're still alive).
  for (const id of [...s.cast].sort()) {
    if (isHuman(id)) continue;
    if (!s.leaders[id].alive) continue;
    const bank = getBank(id);
    if (!bank) continue;
    const snapBack = s.lastColumnNamedLeader === id;
    const r = pickLine(bank, 'preRoundMood', s.rngState, { snapBack, substitutions: { leader: s.leaders[id].name } });
    s.rngState = r.rngState;
    events.push({ kind: 'PreRoundMood', leaderId: id, quote: r.quote, snapBack });
  }
  // Clear snap-back flag after emission.
  s.lastColumnNamedLeader = undefined;

  // OrdersSealed events first (cast id-ASC).
  for (const id of [...s.cast].sort()) {
    const sealed = s.pendingOrders[id];
    if (sealed) {
      events.push({ kind: 'OrdersSealed', leaderId: id, orderCount: sealed.orders.length });
    }
  }

  // Phase: Defences (defence builds resolve first so this round's shields/AA count).
  for (const id of [...s.cast].sort()) {
    const sealed = s.pendingOrders[id];
    if (!sealed) continue;
    const r = applyDefenceBuilds(s, id, sealed.orders);
    s = r.state;
    events.push(...r.events);
  }

  // Phase: other Builds.
  for (const id of [...s.cast].sort()) {
    const sealed = s.pendingOrders[id];
    if (!sealed) continue;
    const r = applyOtherBuilds(s, id, sealed.orders);
    s = r.state;
    events.push(...r.events);
  }

  // Phase: Propaganda.
  const allOrders: Partial<Record<LeaderId, Order[]>> = {};
  for (const id of s.cast) allOrders[id] = s.pendingOrders[id]?.orders ?? [];
  {
    const r = applyPropaganda(s, allOrders);
    s = r.state;
    events.push(...r.events);
  }

  // Phase: Wooing.
  {
    const r = applyWooing(s, allOrders);
    s = r.state;
    events.push(...r.events);
  }

  // Phase: Launches. Three-step flow per Task 11 split:
  //   collectLaunches → consumeStockFor (validates + consumes) → applyLaunches.
  // Final Retaliation has its own consumption loop (Task 12) but lands in the
  // same `applyLaunches` so intercepts and damage stay symmetric.
  //
  // The incoming counter is round-scoped (spec §6): we initialise it once here
  // and thread it through both the regular launch phase and the FR cascade so
  // the Nth-incoming tally accumulates correctly across calls.
  const launches = collectLaunches(allOrders);
  const incomingCounter = makeIncomingCounter(s.cast);
  {
    const consumed = consumeStockFor(s, launches);
    s = consumed.state;
    const r = applyLaunches(s, consumed.validLaunches, incomingCounter);
    s = r.state;
    events.push(...r.events);
    Object.assign(incomingCounter, r.incoming);
  }

  // Status: mark newly-eliminated leaders.
  const newlyDead: LeaderId[] = [];
  for (const id of s.cast) {
    const l = s.leaders[id];
    if (l.alive && l.population <= 0) {
      l.alive = false;
      l.population = 0;
      events.push({ kind: 'LeaderEliminated', id });
      newlyDead.push(id);
    }
  }

  // Phase: Final Retaliation cascade.
  if (newlyDead.length > 0) {
    const r = applyFinalRetaliation(s, newlyDead, incomingCounter);
    s = r.state;
    events.push(...r.events);
  }

  // P4a: Disparage cameo. For each ImpactPeople/ImpactInfrastructure event,
  // probabilistically inject a DisparageCameo event immediately after it.
  // P4c.3: cap at one cameo per round — once one fires, stop rolling.
  {
    const expanded: ResolutionEvent[] = [];
    let cameoEmitted = false;
    for (const e of events) {
      expanded.push(e);
      if (
        !cameoEmitted &&
        (e.kind === 'ImpactPeople' || e.kind === 'ImpactInfrastructure')
      ) {
        const roll = shouldRollCameo(s.rngState);
        s.rngState = roll.rngState;
        if (roll.fire) {
          const linePick = nextRoundLine(disparageBank.cameo, s.rngState);
          s.rngState = linePick.rngState;
          expanded.push({
            kind: 'DisparageCameo',
            afterImpact: { from: e.from, to: e.target },
            quote: linePick.line,
          });
          cameoEmitted = true;
        }
      }
    }
    events.length = 0;
    events.push(...expanded);
  }

  // P4a: populate quote fields on existing events. Single pass; uses the
  // seeded RNG threaded through s.rngState. Quotes are optional, so callers
  // can skip them without breaking the type system.
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    switch (e.kind) {
      case 'MissileLaunched': {
        const bank = isHuman(e.from) ? undefined : getBank(e.from);
        if (!bank) break;
        const p = pickLine(bank, 'launch', s.rngState, { substitutions: { target: s.leaders[e.to].name } });
        s.rngState = p.rngState;
        events[i] = { ...e, attackerQuote: p.quote };
        break;
      }
      case 'ImpactPeople':
      case 'ImpactInfrastructure': {
        const bank = isHuman(e.target) ? undefined : getBank(e.target);
        if (!bank) break;
        const p = pickLine(bank, 'hit', s.rngState, { substitutions: { leader: s.leaders[e.target].name } });
        s.rngState = p.rngState;
        events[i] = { ...e, targetQuote: p.quote };
        break;
      }
      case 'PropagandaTransfer': {
        const senderBank = isHuman(e.from) ? undefined : getBank(e.from);
        const receiverBank = isHuman(e.to) ? undefined : getBank(e.to);
        let senderQuote: string | undefined;
        let receiverQuote: string | undefined;
        if (senderBank) {
          const p = pickLine(senderBank, 'propagandaSend', s.rngState, { substitutions: { target: s.leaders[e.to].name } });
          s.rngState = p.rngState;
          senderQuote = p.quote;
        }
        if (receiverBank) {
          const p = pickLine(receiverBank, 'propagandaReceive', s.rngState, { substitutions: { leader: s.leaders[e.to].name } });
          s.rngState = p.rngState;
          receiverQuote = p.quote;
        }
        events[i] = { ...e, senderQuote, receiverQuote };
        break;
      }
      case 'WooApplied': {
        const senderBank = isHuman(e.from) ? undefined : getBank(e.from);
        const receiverBank = isHuman(e.to) ? undefined : getBank(e.to);
        let senderQuote: string | undefined;
        let receiverQuote: string | undefined;
        if (senderBank) {
          const p = pickLine(senderBank, 'woo', s.rngState);
          s.rngState = p.rngState;
          senderQuote = p.quote;
        }
        if (receiverBank) {
          const p = pickLine(receiverBank, 'beingWooed', s.rngState, { substitutions: { leader: s.leaders[e.to].name } });
          s.rngState = p.rngState;
          receiverQuote = p.quote;
        }
        events[i] = { ...e, senderQuote, receiverQuote };
        break;
      }
      case 'FactoryBuilt': {
        const bank = isHuman(e.by) ? undefined : getBank(e.by);
        if (!bank) break;
        const p = pickLine(bank, 'buildFactory', s.rngState, { substitutions: { leader: s.leaders[e.by].name } });
        s.rngState = p.rngState;
        events[i] = { ...e, quote: p.quote };
        break;
      }
      case 'DefenceBuilt': {
        const bank = isHuman(e.by) ? undefined : getBank(e.by);
        if (!bank) break;
        const p = pickLine(bank, 'buildDefence', s.rngState, { substitutions: { leader: s.leaders[e.by].name } });
        s.rngState = p.rngState;
        events[i] = { ...e, quote: p.quote };
        break;
      }
      case 'LeaderEliminated': {
        const bank = isHuman(e.id) ? undefined : getBank(e.id);
        if (!bank) break;
        const p = pickLine(bank, 'death', s.rngState, { substitutions: { leader: s.leaders[e.id].name } });
        s.rngState = p.rngState;
        events[i] = { ...e, quote: p.quote };
        break;
      }
      case 'FinalRetaliationTriggered': {
        const bank = isHuman(e.by) ? undefined : getBank(e.by);
        if (!bank) break;
        const p = pickLine(bank, 'finalRetaliation', s.rngState, { substitutions: { leader: s.leaders[e.by].name } });
        s.rngState = p.rngState;
        events[i] = { ...e, quote: p.quote };
        break;
      }
      default:
        break;
    }
  }

  // Update grudge / recentAggressionFrom on receivers based on landed impacts.
  // Walks the events emitted by both applyLaunches AND applyFinalRetaliation,
  // so FR cascade impacts also attribute grudge to the dying leader.
  for (const e of events) {
    if (e.kind === 'ImpactPeople' || e.kind === 'ImpactInfrastructure') {
      const victim = s.leaders[e.target];
      if (!victim) continue;
      const grudgeBump = AI_SCORING_WEIGHTS.grudgePerImpact[e.warhead];
      victim.grudge[e.from] = (victim.grudge[e.from] ?? 0) + grudgeBump;
      victim.recentAggressionFrom[e.from] = (victim.recentAggressionFrom[e.from] ?? 0) + 1;
    }
  }

  // Decay relationships.
  s = decayFavourability(s);

  // P4b: clear deployed pool. Deployed defences are consumed at round end
  // regardless of whether they intercepted (deploy = commit).
  for (const id of s.cast) {
    const l = s.leaders[id];
    if (l.deployedShields > 0) {
      events.push({ kind: 'DefenceConsumed', by: id, type: 'shield' });
    }
    if (l.deployedAA > 0) {
      events.push({ kind: 'DefenceConsumed', by: id, type: 'aa' });
    }
    l.deployedShields = 0;
    l.deployedAA = 0;
  }

  // P4a: emit PostRoundReaction per living non-human leader.
  for (const id of [...s.cast].sort()) {
    if (isHuman(id)) continue;
    if (!s.leaders[id].alive) continue;
    const bank = getBank(id);
    if (!bank) continue;
    const r = pickLine(bank, 'reaction', s.rngState, { substitutions: { leader: s.leaders[id].name } });
    s.rngState = r.rngState;
    events.push({ kind: 'PostRoundReaction', leaderId: id, quote: r.quote });
  }

  // AP refresh + banking + bonuses (survivors only).
  // IMPORTANT: bonus rule reads from the ORIGINAL `state` parameter (not `s`),
  // because s.pendingOrders has already been cleared mid-function via allOrders snapshot.
  // We read state.pendingOrders[id]?.orders to get this round's sealed orders.
  for (const id of s.cast) {
    const l = s.leaders[id];
    if (!l.alive) continue;
    const banked = Math.min(AP_BANK_CAP, Math.max(0, Math.floor(l.ap)));
    l.apBanked = banked;
    const factoryAp = Math.floor(l.factories * FACTORY_AP_RATE);
    const bonus = leaderBonusAp(id, state.pendingOrders[id]?.orders ?? []);
    l.ap = factoryAp + banked + bonus;
  }

  // Persist this round's orders for next round's planAi (Hard-mode lookahead
  // reads the most recent non-empty round within the last few rounds for human
  // opponents — see recentHumanOrders; AI opponents are still re-planned via
  // dispatch). Read from the original `state` parameter to match the existing
  // pattern in this function (see line 119-121).
  const thisRound: Partial<Record<LeaderId, Order[]>> = {};
  for (const id of s.cast) {
    const sealed = state.pendingOrders[id];
    if (sealed) thisRound[id] = sealed.orders;
  }
  s.orderHistory = [...state.orderHistory, thisRound];
  // Clear pending, advance round.
  s.pendingOrders = {};
  s.round += 1;

  // Win check.
  const outcome = checkOutcome(s, startOfRoundPop);
  if (outcome) {
    s.outcome = outcome;
    events.push({ kind: 'OutcomeReached', outcome });
  }

  // P4a: Disparage column roll. Fires probabilistically; if it does, pick a
  // named leader (preferring attackers), draw a column line + footer, set
  // lastColumnNamedLeader so the next round's PreRoundMood can snap back.
  {
    const roll = shouldRollColumn(s.rngState);
    s.rngState = roll.rngState;
    if (roll.fire) {
      const livingLeaders = s.cast.filter((id) => s.leaders[id].alive);
      const picked = pickColumnNamedLeader(events, livingLeaders, s.rngState);
      s.rngState = picked.rngState;

      const linePick = nextRoundLine(disparageBank.columnLines, s.rngState);
      s.rngState = linePick.rngState;

      const footerIndex = (s.round - 1) % disparageBank.footerNotes.length;
      const footer = disparageBank.footerNotes[footerIndex];

      events.push({
        kind: 'DisparageColumn',
        namedLeader: picked.namedLeader,
        quote: linePick.line,
        footer,
      });

      if (picked.namedLeader) {
        s.lastColumnNamedLeader = picked.namedLeader;
      }
    }
  }

  // Append to persistent log.
  s.log = [...s.log, ...events];

  return { state: s, events };
}

function nextRoundLine(pool: string[], rngState: number): { line: string; rngState: number } {
  const step = nextInt(rngState, pool.length);
  return { line: pool[step.value], rngState: step.state };
}

function leaderBonusAp(id: LeaderId, thisRoundsOrders: Order[]): number {
  const profile = LEADER_PROFILES[id];
  switch (profile.bonusRule) {
    case 'netanyahoo-launch-bonus':
      return thisRoundsOrders.some((o) => o.kind === 'launch') ? 1 : 0;
    case 'mileigh-aggression-bonus': {
      if (thisRoundsOrders.length === 0) return 0;
      const aggressive = thisRoundsOrders.every(
        (o) => o.kind === 'launch' || o.kind === 'propaganda',
      );
      return aggressive ? 2 : 0;
    }
    case 'chump-defence-waste':
      // Phase 2 implements the -1 penalty when defences pile beyond useful depth.
      return 0;
    default:
      return 0;
  }
}
