import { describe, it, expect } from 'vitest';
import { planNetanyahoo } from '../../../src/engine/ai/netanyahoo';
import { initialState } from '../../../src/engine/state';

describe('Netanyahoo (Warmonger)', () => {
  it('does not launch at Chump until Chump has attacked first', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'n1' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    // No grudge / aggression from chump → Chump-exception fires.
    const orders = planNetanyahoo(s, 'netanyahoo');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeUndefined();
  });

  it('launches at Chump once Chump has attacked', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'n2' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s.leaders.netanyahoo.grudge = { chump: 5 };
    const orders = planNetanyahoo(s, 'netanyahoo');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('chump');
  });

  it('propagandises Chump even when not launching', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'n3' });
    const orders = planNetanyahoo(s, 'netanyahoo');
    expect(orders.some((o) => o.kind === 'propaganda' && o.target === 'chump')).toBe(true);
  });

  it('biases toward the largest-arsenal target', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'n4' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s.leaders.netanyahoo.grudge = { chump: 1 }; // chump is allowed
    s.leaders.carnage.stockpile.warheadsLarge = 5; // largest arsenal
    s.leaders.starmless.stockpile.warheadsSmall = 1;
    const orders = planNetanyahoo(s, 'netanyahoo');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('carnage');
  });
});
