import { describe, expect, it } from 'vitest';
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { resolveRound } from '../../src/engine/resolution';

describe('intercept reads deployed pool', () => {
  it('stockpile.shields alone does NOT intercept (deployed pool is what counts)', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'no-intercept-when-undeployed',
    });
    // Carnage has shields in stockpile but does NOT deploy them
    s.leaders.carnage.stockpile.shields = 5;
    s.leaders.carnage.deployedShields = 0;
    // Chump arms up to fire
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.ap = 5;

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const intercepted = r.events.find((e) => e.kind === 'MissileIntercepted');
    const impact = r.events.find((e) => e.kind === 'ImpactPeople');
    expect(intercepted).toBeUndefined(); // no deployed = no intercept guarantee
    expect(impact).toBeDefined();         // missile lands
  });

  it('deployedShields = 1 intercepts first incoming missile', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'intercept-deployed',
    });
    s.leaders.carnage.deployedShields = 1; // deployed for this round
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.ap = 5;

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const intercepted = r.events.find((e) => e.kind === 'MissileIntercepted');
    expect(intercepted).toBeDefined();
  });
});
