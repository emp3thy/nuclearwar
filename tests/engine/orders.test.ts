import { describe, it, expect } from 'vitest';
import {
  apCostOf,
  totalApCost,
  validateOrder,
  validateOrderSequence,
} from '../../src/engine/orders';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

describe('apCostOf', () => {
  it('matches spec costs', () => {
    expect(apCostOf({ kind: 'build-factory' })).toBe(3);
    expect(apCostOf({ kind: 'build-missile' })).toBe(1);
    expect(apCostOf({ kind: 'build-bomber' })).toBe(1);
    expect(apCostOf({ kind: 'build-warhead', yield: 'small' })).toBe(1);
    expect(apCostOf({ kind: 'build-warhead', yield: 'medium' })).toBe(2);
    expect(apCostOf({ kind: 'build-warhead', yield: 'large' })).toBe(3);
    expect(apCostOf({ kind: 'build-defence', type: 'shield' })).toBe(4);
    expect(apCostOf({ kind: 'build-defence', type: 'aa' })).toBe(4);
    expect(
      apCostOf({
        kind: 'launch',
        target: 'carnage',
        delivery: 'missile',
        warhead: 'small',
        targetType: 'people',
      }),
    ).toBe(2);
    expect(apCostOf({ kind: 'propaganda', target: 'carnage' })).toBe(1);
    expect(apCostOf({ kind: 'woo', target: 'carnage' })).toBe(1);
  });
});

describe('totalApCost', () => {
  it('sums costs across an order list', () => {
    expect(
      totalApCost([
        { kind: 'build-factory' },
        { kind: 'build-missile' },
        { kind: 'build-warhead', yield: 'small' },
      ]),
    ).toBe(5);
  });

  it('returns 0 for empty list', () => {
    expect(totalApCost([])).toBe(0);
  });
});

describe('validateOrder', () => {
  const baseState = initialState({
    cast: ['chump', 'carnage'],
    difficulty: 'normal',
    seed: 'x',
  });

  it('rejects launches with no missile in stockpile', () => {
    const r = validateOrder(baseState, 'chump', {
      kind: 'launch',
      target: 'carnage',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects launches with no warhead in stockpile', () => {
    const s = structuredClone(baseState);
    s.leaders.chump.stockpile.missiles = 1;
    const r = validateOrder(s, 'chump', {
      kind: 'launch',
      target: 'carnage',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(false);
  });

  it('accepts a launch when delivery and warhead are stocked', () => {
    const s = structuredClone(baseState);
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const r = validateOrder(s, 'chump', {
      kind: 'launch',
      target: 'carnage',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects self-targeted launches', () => {
    const s = structuredClone(baseState);
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const r = validateOrder(s, 'chump', {
      kind: 'launch',
      target: 'chump',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects launches at dead targets', () => {
    const s = structuredClone(baseState);
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.alive = false;
    const r = validateOrder(s, 'chump', {
      kind: 'launch',
      target: 'carnage',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects woo orders targeting a dead leader', () => {
    // P4b: woo is flat (no points field). Validate that dead-target rejection still holds.
    const s = structuredClone(baseState);
    s.leaders.carnage.alive = false;
    const r = validateOrder(s, 'chump', { kind: 'woo', target: 'carnage' });
    expect(r.ok).toBe(false);
  });

  it('accepts build orders unconditionally', () => {
    expect(validateOrder(baseState, 'chump', { kind: 'build-factory' }).ok).toBe(true);
    expect(validateOrder(baseState, 'chump', { kind: 'build-defence', type: 'shield' }).ok).toBe(true);
  });
});

describe('validateOrderSequence', () => {
  it('accepts a sequence of valid orders within AP budget', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'seq-1' });
    const orders: Order[] = [{ kind: 'build-factory' }, { kind: 'build-missile' }];
    const r = validateOrderSequence(s, 'chump', orders);
    expect(r.ok).toBe(true);
  });

  it('rejects a second launch that would over-consume stockpile', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'seq-2' });
    // Give chump just one missile + one warhead
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const launch: Order = {
      kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people',
    };
    const r = validateOrderSequence(s, 'chump', [launch, launch]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.orderIndex).toBe(1);
      expect(r.reason).toMatch(/missile|warhead|stockpile/i);
    }
  });
});
