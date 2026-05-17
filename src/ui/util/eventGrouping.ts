import type { ResolutionEvent } from '../../engine/types';

/**
 * One render unit for the Action screen: an event plus how many identical
 * build events it stands for. `count` is 1 for everything except a collapsed
 * run of build events.
 */
export interface GroupedEvent {
  event: ResolutionEvent;
  count: number;
}

/** Grouping key for a build event, or null if `e` is not a build event. */
function buildKey(e: ResolutionEvent): string | null {
  switch (e.kind) {
    case 'FactoryBuilt': return `factory|${e.by}`;
    case 'DeliveryBuilt': return `delivery|${e.by}|${e.type}`;
    case 'WarheadBuilt': return `warhead|${e.by}|${e.yield}`;
    case 'DefenceBuilt': return `defence|${e.by}|${e.type}`;
    default: return null;
  }
}

/**
 * Collapse a phase's events for display:
 *  - build events (factory / delivery / warhead / defence) are counted per
 *    (leader, item) and folded into one GroupedEvent positioned at the first
 *    such build — so a leader's builds group whether or not they are adjacent
 *    (the human's build clicks arrive interleaved; the AI's do not);
 *  - ImpactPeople / ImpactInfrastructure events are summed per
 *    (target, attacker) pair into a single event positioned at the first hit.
 * Every other event passes through unchanged with `count` 1.
 *
 * Pure: the input array and its events are never mutated.
 */
export function groupPhaseEvents(events: ResolutionEvent[]): GroupedEvent[] {
  // Pre-aggregate: sum impacts per (target, attacker); count builds per item.
  const peopleSum = new Map<string, number>();
  const infraSum = new Map<string, number>();
  const buildCount = new Map<string, number>();
  for (const e of events) {
    if (e.kind === 'ImpactPeople') {
      const k = `${e.target}|${e.from}`;
      peopleSum.set(k, (peopleSum.get(k) ?? 0) + e.deaths);
    } else if (e.kind === 'ImpactInfrastructure') {
      const k = `${e.target}|${e.from}`;
      infraSum.set(k, (infraSum.get(k) ?? 0) + e.factoriesDestroyed);
    } else {
      const bk = buildKey(e);
      if (bk !== null) buildCount.set(bk, (buildCount.get(bk) ?? 0) + 1);
    }
  }

  const seenPeople = new Set<string>();
  const seenInfra = new Set<string>();
  const seenBuild = new Set<string>();
  const out: GroupedEvent[] = [];

  for (const e of events) {
    if (e.kind === 'ImpactPeople') {
      const k = `${e.target}|${e.from}`;
      if (seenPeople.has(k)) continue;
      seenPeople.add(k);
      out.push({ event: { ...e, deaths: peopleSum.get(k) ?? e.deaths }, count: 1 });
      continue;
    }
    if (e.kind === 'ImpactInfrastructure') {
      const k = `${e.target}|${e.from}`;
      if (seenInfra.has(k)) continue;
      seenInfra.add(k);
      out.push({
        event: { ...e, factoriesDestroyed: infraSum.get(k) ?? e.factoriesDestroyed },
        count: 1,
      });
      continue;
    }
    const bk = buildKey(e);
    if (bk !== null) {
      if (seenBuild.has(bk)) continue;
      seenBuild.add(bk);
      out.push({ event: e, count: buildCount.get(bk) ?? 1 });
      continue;
    }
    out.push({ event: e, count: 1 });
  }

  return out;
}
