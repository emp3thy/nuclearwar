import { describe, expect, it } from 'vitest';
import {
  CAMEO_PROB,
  COLUMN_PROB,
  shouldRollCameo,
  pickColumnNamedLeader,
} from '../../src/engine/cameo';
import { seedFromString } from '../../src/engine/rng';
import type { LeaderId, ResolutionEvent } from '../../src/engine/types';

describe('cameo', () => {
  it('probabilities are 0.175 (cameo) and 1/3 (column) per spec', () => {
    expect(CAMEO_PROB).toBeCloseTo(0.175, 3);
    expect(COLUMN_PROB).toBeCloseTo(1 / 3, 3);
  });

  it('shouldRollCameo is deterministic per seed', () => {
    const seed = seedFromString('cameo-det');
    expect(shouldRollCameo(seed)).toEqual(shouldRollCameo(seed));
  });

  it('shouldRollCameo threads rngState forward', () => {
    const before = seedFromString('thread');
    const r = shouldRollCameo(before);
    expect(r.rngState).not.toBe(before);
  });

  it('shouldRollCameo produces a mix of fire/skip across seeds', () => {
    const fires = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p']
      .map((s) => shouldRollCameo(seedFromString(s)).fire);
    expect(fires.some((f) => f)).toBe(true);
    expect(fires.some((f) => !f)).toBe(true);
  });

  it('pickColumnNamedLeader prefers a leader who attacked this round', () => {
    const events: ResolutionEvent[] = [
      { kind: 'MissileLaunched', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const livingLeaders: LeaderId[] = ['chump', 'carnage', 'burnem'];
    const r = pickColumnNamedLeader(events, livingLeaders, seedFromString('pick'));
    expect(r.namedLeader).toBe('chump');
  });

  it('pickColumnNamedLeader falls back to uniform pick among living leaders when nobody attacked', () => {
    const events: ResolutionEvent[] = [];
    const livingLeaders: LeaderId[] = ['chump', 'carnage', 'burnem'];
    const r = pickColumnNamedLeader(events, livingLeaders, seedFromString('fallback'));
    expect(livingLeaders).toContain(r.namedLeader);
  });

  it('pickColumnNamedLeader returns undefined when no living leaders', () => {
    const r = pickColumnNamedLeader([], [], seedFromString('empty'));
    expect(r.namedLeader).toBeUndefined();
  });
});
