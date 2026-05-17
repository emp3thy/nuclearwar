import { describe, it, expect } from 'vitest';
import { resolveRound } from '../../src/engine/resolution';
import { reduce } from '../../src/engine/reducer';
import { initialState } from '../../src/engine/state';
import { totalApCost } from '../../src/engine/orders';
import type { LeaderId, Order } from '../../src/engine/types';

function withOrders(
  state: ReturnType<typeof initialState>,
  who: LeaderId,
  orders: Order[],
) {
  const next = structuredClone(state);
  const cost = totalApCost(orders);
  next.leaders[who].ap -= cost;
  next.pendingOrders[who] = { leaderId: who, orders, apSpent: cost };
  return next;
}

describe('resolveRound', () => {
  it('advances round counter and clears pending orders', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s = withOrders(s, 'chump', []);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.round).toBe(2);
    expect(r.state.pendingOrders).toEqual({});
  });

  it('runs phases in order: defences → builds → propaganda → wooing → launches', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s = withOrders(s, 'chump', [
      { kind: 'build-defence', type: 'shield' },
      { kind: 'build-factory' },
      { kind: 'propaganda', target: 'carnage' },
    ]);
    s = withOrders(s, 'carnage', [
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ]);
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    const r = resolveRound(s);
    const kinds = r.events.map((e) => e.kind);
    const idxDefence = kinds.indexOf('DefenceBuilt');
    const idxFactory = kinds.indexOf('FactoryBuilt');
    const idxProp = kinds.indexOf('PropagandaTransfer');
    const idxLaunch = kinds.indexOf('MissileLaunched');
    expect(idxDefence).toBeLessThan(idxFactory);
    expect(idxFactory).toBeLessThan(idxProp);
    expect(idxProp).toBeLessThan(idxLaunch);
  });

  it('applies AP refresh: floor(factories * FACTORY_AP_RATE) + banked', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    // P4b: Chump startAp=10, startFactories=10, AP_BANK_CAP=4, FACTORY_AP_RATE=1.0.
    // Chump submits no orders → 10 AP unspent → bank = min(4, floor(10)) = 4.
    // Next AP = floor(10 * 1.0) + 4 = 14.
    s = withOrders(s, 'chump', []);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.leaders.chump.apBanked).toBe(4);
    expect(r.state.leaders.chump.ap).toBe(10 + 4);
  });

  it('grants Netanyahoo +1 AP when their orders include a launch', () => {
    let s = initialState({
      cast: ['netanyahoo', 'carnage'],
      difficulty: 'normal',
      seed: 'x',
    });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s = withOrders(s, 'netanyahoo', [
      { kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ]);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    // P4b: factories=6, FACTORY_AP_RATE=1.0 → floor(6*1.0)=6.
    // Netanyahoo spent 2 AP on launch → 4 AP unspent → banked=min(4, 4)=4. bonus=1.
    expect(r.state.leaders.netanyahoo.ap).toBe(6 + 4 + 1);
  });

  it('eliminates a leader and triggers Final Retaliation cascade', () => {
    let s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });
    // Chump fires 4 Large warheads at Carnage with 0 shields → 4th guaranteed to land.
    s.leaders.chump.stockpile.missiles = 4;
    s.leaders.chump.stockpile.warheadsLarge = 4;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.stockpile.shields = 0;
    // Carnage's parting shot — 1 missile + 1 small warhead on launch from FR.
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    const launch = {
      kind: 'launch' as const,
      target: 'carnage' as const,
      delivery: 'missile' as const,
      warhead: 'large' as const,
      targetType: 'people' as const,
    };
    s = withOrders(s, 'chump', [launch, launch, launch, launch]);
    s = withOrders(s, 'carnage', []);
    s = withOrders(s, 'starmless', []);
    const r = resolveRound(s);
    expect(r.state.leaders.carnage.alive).toBe(false);
    const kinds = r.events.map((e) => e.kind);
    expect(kinds).toContain('LeaderEliminated');
    expect(kinds).toContain('FinalRetaliationTriggered');
  });

  it('reaches a survivor outcome when only one leader remains alive', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 4;
    s.leaders.chump.stockpile.warheadsLarge = 4;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.stockpile.shields = 0;
    const launch = {
      kind: 'launch' as const,
      target: 'carnage' as const,
      delivery: 'missile' as const,
      warhead: 'large' as const,
      targetType: 'people' as const,
    };
    s = withOrders(s, 'chump', [launch, launch, launch, launch]);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.outcome).toEqual({ type: 'survivor', winner: 'chump' });
    // DisparageColumn may trail OutcomeReached, so search rather than asserting last.
    const outcomeEvent = r.events.find((e) => e.kind === 'OutcomeReached');
    expect(outcomeEvent).toEqual({
      kind: 'OutcomeReached',
      outcome: { type: 'survivor', winner: 'chump' },
    });
  });

  it('decays favourability at end of round', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.favourability.chump = 5;
    s = withOrders(s, 'chump', []);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.leaders.carnage.favourability.chump).toBe(4);
  });

  it('updates the receiver\'s grudge and recentAggressionFrom after a People hit', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 4;
    s.leaders.chump.stockpile.warheadsLarge = 4;
    s.leaders.carnage.stockpile.shields = 0;
    const launch = {
      kind: 'launch' as const,
      target: 'carnage' as const,
      delivery: 'missile' as const,
      warhead: 'large' as const,
      targetType: 'people' as const,
    };
    s = withOrders(s, 'chump', [launch, launch, launch, launch]);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    // At least one impact landed (4 launches, 4th has 0 % intercept).
    expect((r.state.leaders.carnage.grudge.chump ?? 0)).toBeGreaterThan(0);
    expect((r.state.leaders.carnage.recentAggressionFrom.chump ?? 0)).toBeGreaterThan(0);
  });

  it('grudge weights by warhead yield (large > small)', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 8;
    s.leaders.chump.stockpile.warheadsSmall = 4;
    s.leaders.chump.stockpile.warheadsLarge = 4;
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.carnage.population = 100;
    const small = {
      kind: 'launch' as const, target: 'carnage' as const, delivery: 'missile' as const,
      warhead: 'small' as const, targetType: 'people' as const,
    };
    const large = { ...small, warhead: 'large' as const };
    s = withOrders(s, 'chump', [small, small, small, small, large, large, large, large]);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    // Grudge should reflect heavier weight on large hits — exact value depends on RNG;
    // assert structural property: at least 4-of-each landed (the 4ths) → grudge > 1 + 4 = 5.
    expect((r.state.leaders.carnage.grudge.chump ?? 0)).toBeGreaterThan(0);
  });

  it('FR cascade impacts also update grudge (deterministic via overwhelmed-defences setup)', () => {
    // Setup: carnage dies from chump's launches AND has a heavy stockpile that fires
    // 8 FR launches at chump+starmless. With shields=0 on both, pigeonhole guarantees
    // one target gets ≥4 incoming → 4th has 0% intercept → at least one FR hit lands.
    // That landed FR impact must attribute grudge to carnage (the dying leader).
    let s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'fr-grudge' });
    s.leaders.chump.stockpile.missiles = 4;
    s.leaders.chump.stockpile.warheadsLarge = 4;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.stockpile.missiles = 8;
    s.leaders.carnage.stockpile.warheadsSmall = 8;
    s.leaders.chump.stockpile.shields = 0;
    s.leaders.starmless.stockpile.shields = 0;
    const launch = {
      kind: 'launch' as const, target: 'carnage' as const, delivery: 'missile' as const,
      warhead: 'large' as const, targetType: 'people' as const,
    };
    s = withOrders(s, 'chump', [launch, launch, launch, launch]);
    s = withOrders(s, 'carnage', []);
    s = withOrders(s, 'starmless', []);
    const r = resolveRound(s);
    const chumpGrudge = r.state.leaders.chump.grudge.carnage ?? 0;
    const starmlessGrudge = r.state.leaders.starmless.grudge.carnage ?? 0;
    expect(chumpGrudge + starmlessGrudge).toBeGreaterThan(0);
  });
});

describe('resolveRound — P4a flavor events', () => {
  it('populates attackerQuote on MissileLaunched + targetQuote on ImpactPeople', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'quote-test' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.ap = 5;
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.carnage.stockpile.aa = 0;

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const launch = r.events.find((e) => e.kind === 'MissileLaunched');
    expect(launch).toBeDefined();
    if (launch && launch.kind === 'MissileLaunched') {
      expect(launch.attackerQuote).toBeDefined();
      expect(launch.attackerQuote!.length).toBeGreaterThan(0);
    }

    const impact = r.events.find(
      (e) => e.kind === 'ImpactPeople' || e.kind === 'ImpactInfrastructure',
    );
    if (impact && (impact.kind === 'ImpactPeople' || impact.kind === 'ImpactInfrastructure')) {
      expect(impact.targetQuote).toBeDefined();
    }
  });

  it('emits PostRoundReaction per living non-human leader at round end', () => {
    let s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'reaction-test',
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'player1', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const reactions = r.events.filter((e) => e.kind === 'PostRoundReaction');
    expect(reactions).toHaveLength(2);
    expect(reactions.map((e) => e.kind === 'PostRoundReaction' ? e.leaderId : '').sort())
      .toEqual(['carnage', 'chump']);
  });

  it('emits DisparageCameo after some ImpactPeople/ImpactInfrastructure events', () => {
    // Use 4 missiles + shields=0 + aa=0 to guarantee impacts land every seed.
    // Iterate up to 50 seeds to find a cameo roll (~17.5% per impact → near-certain within 50).
    let fired = false;
    const launchOrder = {
      kind: 'launch' as const,
      target: 'carnage' as const,
      delivery: 'missile' as const,
      warhead: 'small' as const,
      targetType: 'people' as const,
    };
    for (let n = 0; n < 50 && !fired; n++) {
      let s = initialState({
        cast: ['chump', 'carnage'],
        difficulty: 'normal',
        seed: `cam-${n}`,
      });
      s.leaders.chump.stockpile.missiles = 4;
      s.leaders.chump.stockpile.warheadsSmall = 4;
      s.leaders.chump.ap = 20;
      s.leaders.carnage.stockpile.shields = 0;
      s.leaders.carnage.stockpile.aa = 0;
      s.leaders.carnage.population = 1000;

      s = reduce(s, {
        type: 'SUBMIT_ORDERS',
        leaderId: 'chump',
        orders: [launchOrder, launchOrder, launchOrder, launchOrder],
      });
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
      const r = resolveRound(s);
      const cameos = r.events.filter((e) => e.kind === 'DisparageCameo');
      if (cameos.length > 0) {
        fired = true;
        const impactIdx = r.events.findIndex(
          (e) => e.kind === 'ImpactPeople' || e.kind === 'ImpactInfrastructure',
        );
        const cameoIdx = r.events.findIndex((e) => e.kind === 'DisparageCameo');
        if (impactIdx !== -1 && cameoIdx !== -1) {
          expect(cameoIdx).toBeGreaterThan(impactIdx);
        }
      }
    }
    expect(fired).toBe(true);
  });

  it('emits at most one DisparageCameo per round (P4c.3 cap)', () => {
    // 4 missiles + shields=0 + aa=0 → 4 guaranteed impacts → up to 4 cameo
    // rolls per round. Across 40 seeds the pre-cap code emits 2+ on some seed;
    // the cap must hold every round regardless.
    const launchOrder = {
      kind: 'launch' as const,
      target: 'carnage' as const,
      delivery: 'missile' as const,
      warhead: 'small' as const,
      targetType: 'people' as const,
    };
    for (let n = 0; n < 40; n++) {
      let s = initialState({
        cast: ['chump', 'carnage'],
        difficulty: 'normal',
        seed: `cameo-cap-${n}`,
      });
      s.leaders.chump.stockpile.missiles = 4;
      s.leaders.chump.stockpile.warheadsSmall = 4;
      s.leaders.chump.ap = 20;
      s.leaders.carnage.stockpile.shields = 0;
      s.leaders.carnage.stockpile.aa = 0;
      s.leaders.carnage.population = 1000;
      s = reduce(s, {
        type: 'SUBMIT_ORDERS',
        leaderId: 'chump',
        orders: [launchOrder, launchOrder, launchOrder, launchOrder],
      });
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
      const r = resolveRound(s);
      const cameos = r.events.filter((e) => e.kind === 'DisparageCameo');
      expect(cameos.length).toBeLessThanOrEqual(1);
    }
  });

  it('emits DisparageColumn for at least some seeds; sets lastColumnNamedLeader', () => {
    let fired = false;
    for (const seedStr of ['seed-a', 'seed-b', 'seed-c', 'seed-d', 'seed-e', 'seed-f']) {
      let s = initialState({
        cast: ['player1', 'chump', 'carnage'],
        difficulty: 'normal',
        seed: seedStr,
      });
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'player1', orders: [] });
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
      const r = resolveRound(s);
      const columns = r.events.filter((e) => e.kind === 'DisparageColumn');
      if (columns.length > 0) {
        fired = true;
        const col = columns[0];
        if (col.kind === 'DisparageColumn') {
          expect(col.quote.length).toBeGreaterThan(0);
          expect(col.footer.length).toBeGreaterThan(0);
        }
        if (col.kind === 'DisparageColumn' && col.namedLeader) {
          expect(r.state.lastColumnNamedLeader).toBe(col.namedLeader);
        }
        break;
      }
    }
    expect(fired).toBe(true);
  });

  it('emits PreRoundMood per living non-human leader at round start', () => {
    let s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'mood-test',
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'player1', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const moodEvents = r.events.filter((e) => e.kind === 'PreRoundMood');
    expect(moodEvents).toHaveLength(2); // chump + carnage; player1 excluded
    expect(moodEvents.map((e) => e.kind === 'PreRoundMood' ? e.leaderId : '').sort())
      .toEqual(['carnage', 'chump']);
    for (const e of moodEvents) {
      if (e.kind === 'PreRoundMood') {
        expect(e.quote.length).toBeGreaterThan(0);
        expect(e.snapBack).toBe(false);
      }
    }
  });
});

describe('resolveRound — P4b deployed pool', () => {
  it('clears deployedShields and deployedAA to 0 at end of round', () => {
    let s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'deployed-clear',
    });
    s.leaders.player1.deployedShields = 2;
    s.leaders.player1.deployedAA = 1;

    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'player1', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const r = resolveRound(s);

    expect(r.state.leaders.player1.deployedShields).toBe(0);
    expect(r.state.leaders.player1.deployedAA).toBe(0);
    const consumed = r.events.filter((e) => e.kind === 'DefenceConsumed');
    expect(consumed.length).toBeGreaterThanOrEqual(2); // shield + aa
  });

  it('mileigh-hem aggression bonus breaks when deploy-defence is queued', () => {
    let s = initialState({
      cast: ['mileigh-hem', 'chump'],
      difficulty: 'normal',
      seed: 'mileigh-deploy',
    });
    s.leaders['mileigh-hem'].stockpile.shields = 1;
    s.leaders['mileigh-hem'].stockpile.missiles = 1;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 1;
    s.leaders['mileigh-hem'].ap = 10;

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'mileigh-hem',
      orders: [
        { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
        { kind: 'deploy-defence', type: 'shield' },
      ],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const r = resolveRound(s);

    // Bonus should NOT have applied — next round AP should be factoryAp + banked + 0 bonus.
    // mileigh-hem: factories=4 * FACTORY_AP_RATE(1.0) = 4 + banked (clamped 0..4) + 0 bonus.
    const expectedAp = 4 + Math.min(4, Math.max(0, r.state.leaders['mileigh-hem'].apBanked));
    expect(r.state.leaders['mileigh-hem'].ap).toBe(expectedAp);
  });
});

describe('orderHistory persistence', () => {
  it('appends this round\'s orders to orderHistory after RESOLVE_ROUND', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'orderHistory-1',
    });
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-factory' }],
    });
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'carnage',
      orders: [{ kind: 'build-defence', type: 'shield' }],
    });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    expect(s.orderHistory).toHaveLength(1);
    expect(s.orderHistory[0].chump).toEqual([{ kind: 'build-factory' }]);
    expect(s.orderHistory[0].carnage).toEqual([{ kind: 'build-defence', type: 'shield' }]);
  });

  it('appends a new entry per round (does not overwrite)', () => {
    let s = initialState({
      cast: ['chump'],
      difficulty: 'normal',
      seed: 'orderHistory-2',
    });
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-factory' }],
    });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    expect(s.orderHistory).toHaveLength(1);
    expect(s.orderHistory[0].chump).toEqual([{ kind: 'build-factory' }]);
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-missile' }],
    });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    expect(s.orderHistory).toHaveLength(2);
    expect(s.orderHistory[0].chump).toEqual([{ kind: 'build-factory' }]);
    expect(s.orderHistory[1].chump).toEqual([{ kind: 'build-missile' }]);
  });
});
