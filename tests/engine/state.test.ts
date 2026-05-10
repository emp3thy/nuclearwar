import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/state';

describe('initialState', () => {
  it('seeds Chump and Carnage with their spec values', () => {
    const s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'p1-demo',
    });
    expect(s.round).toBe(1);
    expect(s.outcome).toBeNull();
    expect(s.cast).toEqual(['chump', 'carnage']);
    expect(s.leaders.chump.population).toBe(33);
    expect(s.leaders.chump.factories).toBe(10);
    expect(s.leaders.chump.ap).toBe(5);
    expect(s.leaders.chump.alive).toBe(true);
    expect(s.leaders.carnage.population).toBe(25);
  });

  it('supports a 3-leader cast', () => {
    const s = initialState({
      cast: ['chump', 'carnage', 'starmless'],
      difficulty: 'normal',
      seed: 'x',
    });
    expect(s.cast).toEqual(['chump', 'carnage', 'starmless']);
    expect(Object.keys(s.leaders).sort()).toEqual(['carnage', 'chump', 'starmless']);
    expect(s.leaders.starmless.population).toBe(25);
  });

  it('supports a 5-leader cast', () => {
    const s = initialState({
      cast: ['chump', 'carnage', 'starmless', 'netanyahoo', 'mileigh-hem'],
      difficulty: 'normal',
      seed: 'x',
    });
    expect(s.cast).toHaveLength(5);
  });

  it('seeds an empty stockpile and zeroed relations', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(s.leaders.chump.stockpile).toEqual({
      missiles: 0,
      bombers: 0,
      warheadsSmall: 0,
      warheadsMedium: 0,
      warheadsLarge: 0,
      shields: 0,
      aa: 0,
    });
    expect(s.leaders.chump.favourability).toEqual({});
    expect(s.leaders.chump.grudge).toEqual({});
    expect(s.leaders.chump.recentAggressionFrom).toEqual({});
  });

  it('honours startPopOverride from config', () => {
    const s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'x',
      config: { startPopOverride: { chump: 10 } },
    });
    expect(s.leaders.chump.population).toBe(10);
    expect(s.leaders.carnage.population).toBe(25);
  });

  it('derives rngState deterministically from seed', () => {
    const a = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'abc' });
    const b = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'abc' });
    const c = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'xyz' });
    expect(a.rngState).toBe(b.rngState);
    expect(a.rngState).not.toBe(c.rngState);
  });

  it('defaults config dominanceThreshold to 2 and fastPlay to false', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(s.config.dominanceThreshold).toBe(2);
    expect(s.config.fastPlay).toBe(false);
  });

  it('seeds player1 with default Firefly / Freedonia identity', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'p25-default',
    });
    expect(s.leaders.player1.name).toBe('Rufus T. Firefly');
    expect(s.leaders.player1.country).toBe('🦆 Freedonia');
    expect(s.leaders.player1.population).toBe(25);
    expect(s.leaders.player1.factories).toBe(6);
    expect(s.leaders.player1.ap).toBe(3);
    expect(s.leaders.player1.alive).toBe(true);
    expect(s.leaders.player1.bonusRule).toBeUndefined();
  });
});
