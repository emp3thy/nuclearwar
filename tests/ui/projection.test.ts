import { describe, expect, it } from 'vitest';
import { projectInventory } from '../../src/ui/util/projection';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

function makeLeader() {
  const s = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'projection-test',
  });
  s.leaders.player1.stockpile.missiles = 2;
  s.leaders.player1.stockpile.warheadsSmall = 1;
  s.leaders.player1.stockpile.shields = 1;
  return s.leaders.player1;
}

describe('projectInventory', () => {
  it('returns base inventory when orders is empty', () => {
    const p = projectInventory(makeLeader(), []);
    expect(p.missiles).toBe(2);
    expect(p.warheadsSmall).toBe(1);
    expect(p.shieldsInStockpile).toBe(1);
    expect(p.deployedShields).toBe(0);
  });

  it('adds queued builds', () => {
    const orders: Order[] = [
      { kind: 'build-missile' },
      { kind: 'build-missile' },
      { kind: 'build-warhead', yield: 'small' },
      { kind: 'build-defence', type: 'shield' },
    ];
    const p = projectInventory(makeLeader(), orders);
    expect(p.missiles).toBe(4);
    expect(p.warheadsSmall).toBe(2);
    expect(p.shieldsInStockpile).toBe(2);
  });

  it('subtracts queued launches from delivery + warhead inventory', () => {
    const orders: Order[] = [
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const p = projectInventory(makeLeader(), orders);
    expect(p.missiles).toBe(1);
    expect(p.warheadsSmall).toBe(0);
  });

  it('subtracts deploy from stockpile, adds to deployed', () => {
    const orders: Order[] = [
      { kind: 'deploy-defence', type: 'shield' },
    ];
    const p = projectInventory(makeLeader(), orders);
    expect(p.shieldsInStockpile).toBe(0);
    expect(p.deployedShields).toBe(1);
  });

  it('handles build-then-launch in one round', () => {
    const orders: Order[] = [
      { kind: 'build-missile' },
      { kind: 'build-warhead', yield: 'small' },
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const p = projectInventory(makeLeader(), orders);
    // started: 2 missiles + 1 sm wh; built: +1 missile +1 sm wh; launched: -1 missile -1 sm wh
    expect(p.missiles).toBe(2);
    expect(p.warheadsSmall).toBe(1);
  });

  it('clamps at 0 — does not go negative on invalid sequences', () => {
    const orders: Order[] = [
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const p = projectInventory(makeLeader(), orders);
    expect(p.missiles).toBeGreaterThanOrEqual(0);
    expect(p.warheadsSmall).toBeGreaterThanOrEqual(0);
  });
});
