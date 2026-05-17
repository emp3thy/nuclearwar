import { describe, it, expect } from 'vitest';
import { groupPhaseEvents } from '../../src/ui/util/eventGrouping';
import type { ResolutionEvent } from '../../src/engine/types';

describe('groupPhaseEvents', () => {
  it('collapses consecutive identical build events into one with a count', () => {
    const events: ResolutionEvent[] = [
      { kind: 'WarheadBuilt', by: 'chump', yield: 'small' },
      { kind: 'WarheadBuilt', by: 'chump', yield: 'small' },
      { kind: 'WarheadBuilt', by: 'chump', yield: 'small' },
    ];
    const g = groupPhaseEvents(events);
    expect(g).toHaveLength(1);
    expect(g[0].count).toBe(3);
    expect(g[0].event.kind).toBe('WarheadBuilt');
  });

  it('does not collapse builds of a different item or a different leader', () => {
    const events: ResolutionEvent[] = [
      { kind: 'WarheadBuilt', by: 'chump', yield: 'small' },
      { kind: 'WarheadBuilt', by: 'chump', yield: 'large' },
      { kind: 'WarheadBuilt', by: 'carnage', yield: 'small' },
    ];
    const g = groupPhaseEvents(events);
    expect(g).toHaveLength(3);
    expect(g.every((x) => x.count === 1)).toBe(true);
  });

  it('collapses a leader\'s same-item builds even when interleaved with another item', () => {
    // The human's build clicks arrive interleaved (missile, bomber, missile…),
    // unlike the AI's item-grouped buildToward output.
    const events: ResolutionEvent[] = [
      { kind: 'DeliveryBuilt', by: 'player1', type: 'missile' },
      { kind: 'DeliveryBuilt', by: 'player1', type: 'bomber' },
      { kind: 'DeliveryBuilt', by: 'player1', type: 'missile' },
      { kind: 'DeliveryBuilt', by: 'player1', type: 'bomber' },
    ];
    const g = groupPhaseEvents(events);
    expect(g).toHaveLength(2);
    const missiles = g.find((x) => x.event.kind === 'DeliveryBuilt' && x.event.type === 'missile');
    const bombers = g.find((x) => x.event.kind === 'DeliveryBuilt' && x.event.type === 'bomber');
    expect(missiles?.count).toBe(2);
    expect(bombers?.count).toBe(2);
  });

  it('sums people deaths per (target, attacker) into one event', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'netanyahoo', target: 'carnage', warhead: 'small', deaths: 2 },
      { kind: 'ImpactPeople', from: 'netanyahoo', target: 'carnage', warhead: 'small', deaths: 2 },
      { kind: 'ImpactPeople', from: 'netanyahoo', target: 'carnage', warhead: 'small', deaths: 2 },
    ];
    const g = groupPhaseEvents(events);
    expect(g).toHaveLength(1);
    const e = g[0].event;
    expect(e.kind === 'ImpactPeople' && e.deaths).toBe(6);
  });

  it('keeps separate impact lines for different attackers on the same target', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'netanyahoo', target: 'carnage', warhead: 'small', deaths: 2 },
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'small', deaths: 3 },
    ];
    const g = groupPhaseEvents(events);
    expect(g).toHaveLength(2);
  });

  it('sums infrastructure impacts per (target, attacker)', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactInfrastructure', from: 'chump', target: 'carnage', warhead: 'small', factoriesDestroyed: 1 },
      { kind: 'ImpactInfrastructure', from: 'chump', target: 'carnage', warhead: 'small', factoriesDestroyed: 2 },
    ];
    const g = groupPhaseEvents(events);
    expect(g).toHaveLength(1);
    const e = g[0].event;
    expect(e.kind === 'ImpactInfrastructure' && e.factoriesDestroyed).toBe(3);
  });

  it('does not mutate the input events', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'small', deaths: 2 },
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'small', deaths: 4 },
    ];
    const snapshot = JSON.stringify(events);
    groupPhaseEvents(events);
    expect(JSON.stringify(events)).toBe(snapshot);
  });

  it('passes non-grouped events through unchanged with count 1', () => {
    const events: ResolutionEvent[] = [
      { kind: 'MissileLaunched', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const g = groupPhaseEvents(events);
    expect(g).toHaveLength(1);
    expect(g[0].count).toBe(1);
  });
});
