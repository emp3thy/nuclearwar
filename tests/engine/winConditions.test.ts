import { describe, it, expect } from 'vitest';
import { checkOutcome } from '../../src/engine/winConditions';
import { initialState } from '../../src/engine/state';

describe('checkOutcome', () => {
  const base = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });

  it('returns null while multiple leaders are alive and no dominance', () => {
    expect(checkOutcome(base, { chump: 33, carnage: 25, starmless: 25 })).toBeNull();
  });

  it('returns survivor when exactly one leader has pop > 0', () => {
    const s = structuredClone(base);
    s.leaders.carnage.population = 0;
    s.leaders.carnage.alive = false;
    s.leaders.starmless.population = 0;
    s.leaders.starmless.alive = false;
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toEqual({
      type: 'survivor',
      winner: 'chump',
    });
  });

  it('returns pyrrhic when every leader died this round', () => {
    const s = structuredClone(base);
    for (const id of ['chump', 'carnage', 'starmless'] as const) {
      s.leaders[id].population = 0;
      s.leaders[id].alive = false;
    }
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toEqual({
      type: 'pyrrhic',
      winner: 'chump',
    });
  });

  it('returns apocalypse when nobody had population entering the round', () => {
    const s = structuredClone(base);
    for (const id of ['chump', 'carnage', 'starmless'] as const) {
      s.leaders[id].population = 0;
      s.leaders[id].alive = false;
    }
    expect(checkOutcome(s, { chump: 0, carnage: 0, starmless: 0 })).toEqual({ type: 'apocalypse' });
  });

  it('returns dominance when one leader has 2× the next-highest population', () => {
    const s = structuredClone(base);
    s.leaders.chump.population = 30;
    s.leaders.carnage.population = 14;
    s.leaders.starmless.population = 10;
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toEqual({
      type: 'dominance',
      winner: 'chump',
    });
  });

  it('does not return dominance when ratio is below threshold', () => {
    const s = structuredClone(base);
    s.leaders.chump.population = 30;
    s.leaders.carnage.population = 16; // 30 / 16 = 1.87 < 2
    s.leaders.starmless.population = 10;
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toBeNull();
  });

  it('survivor takes priority over dominance', () => {
    const s = structuredClone(base);
    s.leaders.carnage.population = 0;
    s.leaders.carnage.alive = false;
    s.leaders.starmless.population = 0;
    s.leaders.starmless.alive = false;
    s.leaders.chump.population = 100;
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toEqual({
      type: 'survivor',
      winner: 'chump',
    });
  });
});
