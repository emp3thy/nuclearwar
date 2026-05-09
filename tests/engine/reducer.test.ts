import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reducer';
import { initialState } from '../../src/engine/state';

describe('reduce — NEW_GAME', () => {
  it('replaces state with a fresh game', () => {
    const a = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'first' });
    a.round = 5;
    const b = reduce(a, {
      type: 'NEW_GAME',
      cast: ['chump', 'carnage', 'starmless'],
      difficulty: 'easy',
      seed: 'second',
    });
    expect(b.round).toBe(1);
    expect(b.difficulty).toBe('easy');
    expect(b.seed).toBe('second');
    expect(b.cast).toEqual(['chump', 'carnage', 'starmless']);
  });
});

describe('reduce — SUBMIT_ORDERS', () => {
  it('records orders and deducts AP', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const s1 = reduce(s0, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-factory' }],
    });
    expect(s1.leaders.chump.ap).toBe(s0.leaders.chump.ap - 3);
    expect(s1.pendingOrders.chump?.orders).toHaveLength(1);
    expect(s1.pendingOrders.chump?.apSpent).toBe(3);
  });

  it('rejects orders that exceed AP budget (state unchanged)', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const s1 = reduce(s0, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-factory' }, { kind: 'build-factory' }], // 6 AP, only 5 available
    });
    expect(s1).toBe(s0);
  });

  it('rejects an invalid order (launch with no missile)', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const s1 = reduce(s0, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [
        { kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
      ],
    });
    expect(s1).toBe(s0);
  });

  it('rejects a multi-launch batch that collectively exceeds the leader\'s stockpile', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    // 1 missile + 2 warheads-small; AP enough for 2 launches; 2 launches submitted but only 1 missile.
    s0.leaders.chump.stockpile.missiles = 1;
    s0.leaders.chump.stockpile.warheadsSmall = 2;
    s0.leaders.chump.ap = 4;
    const launch = {
      kind: 'launch' as const,
      target: 'carnage' as const,
      delivery: 'missile' as const,
      warhead: 'small' as const,
      targetType: 'people' as const,
    };
    const s1 = reduce(s0, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [launch, launch],
    });
    expect(s1).toBe(s0); // rejected; identity-equal returned state
  });
});

describe('reduce — RESOLVE_ROUND', () => {
  it('delegates to resolveRound and advances state', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const s1 = reduce(s0, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const s2 = reduce(s1, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const s3 = reduce(s2, { type: 'RESOLVE_ROUND' });
    expect(s3.round).toBe(2);
  });
});

describe('reduce — LOAD_STATE', () => {
  it('returns the loaded state verbatim', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const target = { ...s0, round: 7 };
    expect(reduce(s0, { type: 'LOAD_STATE', state: target })).toBe(target);
  });
});
