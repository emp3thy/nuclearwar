import { describe, it, expect } from 'vitest';
import { applyFinalRetaliation } from '../../src/engine/finalRetaliation';
import { initialState } from '../../src/engine/state';

describe('applyFinalRetaliation', () => {
  it('does nothing when no leader has just died', () => {
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });
    const r = applyFinalRetaliation(s, []);
    expect(r.events).toHaveLength(0);
  });

  it('fires every remaining warhead pairing from a freshly-dead leader', () => {
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });
    // Carnage has just been eliminated. They had 2 missiles and 2 small warheads.
    s.leaders.carnage.stockpile.missiles = 2;
    s.leaders.carnage.stockpile.warheadsSmall = 2;
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    const r = applyFinalRetaliation(s, ['carnage']);
    const fired = r.events.filter((e) => e.kind === 'MissileLaunched');
    expect(fired).toHaveLength(2);
    // FR triggered event present
    expect(r.events.some((e) => e.kind === 'FinalRetaliationTriggered')).toBe(true);
  });

  it('cascades — when death kills a survivor who also has stock, that survivor fires FR too', () => {
    // Use grudge=100 vs chump so all missiles land on chump only (deterministic target).
    // deployedShields=0 → 0% intercept, so 1 large missile kills chump (pop=5).
    // Chump then fires its own FR at starmless → 2 FinalRetaliationTriggered events.
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'fr-cascade-5' });
    s.leaders.carnage.stockpile.missiles = 2;
    s.leaders.carnage.stockpile.warheadsLarge = 2;
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    s.leaders.carnage.grudge = { chump: 100, starmless: 0 }; // all missiles → chump
    s.leaders.chump.population = 5;
    s.leaders.chump.deployedShields = 0;
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.starmless.population = 100; // survives chump's FR
    s.leaders.starmless.deployedShields = 0;
    const r = applyFinalRetaliation(s, ['carnage']);
    const triggers = r.events.filter((e) => e.kind === 'FinalRetaliationTriggered');
    expect(triggers.length).toBeGreaterThanOrEqual(2);
  });

  it('skips when the dead leader had no remaining stockpile', () => {
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    const r = applyFinalRetaliation(s, ['carnage']);
    expect(r.events.filter((e) => e.kind === 'MissileLaunched')).toHaveLength(0);
  });

  it('picks FR targets weighted by the dying leader\'s grudge map (when non-empty)', () => {
    // 3-leader setup: dying leader (carnage) has heavy grudge against starmless.
    // FR should fire mostly at starmless, not chump.
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'fr-grudge' });
    s.leaders.carnage.stockpile.missiles = 8;
    s.leaders.carnage.stockpile.warheadsSmall = 8;
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    s.leaders.carnage.grudge = { starmless: 100, chump: 0 };
    // Both targets vulnerable, no defences.
    s.leaders.chump.stockpile.shields = 0;
    s.leaders.starmless.stockpile.shields = 0;
    const r = applyFinalRetaliation(s, ['carnage']);
    // All 8 launches should target starmless (weight 100 vs 0 → starmless every time).
    const launchedAtStarmless = r.events.filter(
      (e) => e.kind === 'MissileLaunched' && e.to === 'starmless',
    ).length;
    const launchedAtChump = r.events.filter(
      (e) => e.kind === 'MissileLaunched' && e.to === 'chump',
    ).length;
    expect(launchedAtStarmless).toBe(8);
    expect(launchedAtChump).toBe(0);
  });

  it('never picks a zero-weight survivor (boundary: strict > not >= in cumulative draw)', () => {
    // weights=[0, 100]: chump grudge=0, starmless grudge=100.
    // Regardless of seed, the weighted draw must NEVER pick chump.
    // This is the regression for the cumulative >= threshold boundary bug:
    // when RNG returns 0.0, threshold=0 and cumulative=0, so >= would pick
    // the first survivor (chump, weight=0) incorrectly.
    for (let i = 0; i < 30; i++) {
      const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: `fr-boundary-${i}` });
      s.leaders.carnage.stockpile.missiles = 4;
      s.leaders.carnage.stockpile.warheadsSmall = 4;
      s.leaders.carnage.alive = false;
      s.leaders.carnage.population = 0;
      s.leaders.carnage.grudge = { chump: 0, starmless: 100 };
      s.leaders.chump.stockpile.shields = 0;
      s.leaders.starmless.stockpile.shields = 0;
      const r = applyFinalRetaliation(s, ['carnage']);
      const launchedAtChump = r.events.filter(
        (e) => e.kind === 'MissileLaunched' && e.to === 'chump',
      ).length;
      expect(launchedAtChump).toBe(0);
    }
  });

  it('falls back to uniform random when grudge is empty (preserves P1 behaviour)', () => {
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'fr-uniform' });
    s.leaders.carnage.stockpile.missiles = 8;
    s.leaders.carnage.stockpile.warheadsSmall = 8;
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    // grudge empty (default).
    s.leaders.chump.stockpile.shields = 0;
    s.leaders.starmless.stockpile.shields = 0;
    const r = applyFinalRetaliation(s, ['carnage']);
    const launchedAtStarmless = r.events.filter(
      (e) => e.kind === 'MissileLaunched' && e.to === 'starmless',
    ).length;
    const launchedAtChump = r.events.filter(
      (e) => e.kind === 'MissileLaunched' && e.to === 'chump',
    ).length;
    // Both targets should have at least one launch over 8 firings (RNG with seed 'fr-uniform').
    expect(launchedAtStarmless + launchedAtChump).toBe(8);
    expect(launchedAtStarmless).toBeGreaterThan(0);
    expect(launchedAtChump).toBeGreaterThan(0);
  });
});
