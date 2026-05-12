import { describe, expect, it } from 'vitest';
import { analyseOrderSequence } from '../../src/engine/orders';
import { initialState } from '../../src/engine/state';

describe('analyseOrderSequence', () => {
  function state() {
    return initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'softwarn-test',
    });
  }

  it('flags warhead-no-delivery when no delivery is owned or queued', () => {
    const s = state();
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'build-warhead', yield: 'small' },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe('warhead-no-delivery');
    expect(warnings[0].orderIndex).toBe(0);
  });

  it('does NOT flag warhead-no-delivery when a missile is queued before it', () => {
    const s = state();
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'build-missile' },
      { kind: 'build-warhead', yield: 'small' },
    ]);
    expect(warnings.filter((w) => w.kind === 'warhead-no-delivery')).toHaveLength(0);
  });

  it('flags delivery-no-warhead when no warhead is owned or queued', () => {
    const s = state();
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'build-missile' },
    ]);
    expect(warnings.filter((w) => w.kind === 'delivery-no-warhead')).toHaveLength(1);
  });

  it('flags woo-non-attacker when target has no aggression and non-negative favourability', () => {
    const s = state();
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'woo', target: 'chump', points: 1 },
    ]);
    expect(warnings.filter((w) => w.kind === 'woo-non-attacker')).toHaveLength(1);
  });

  it('does NOT flag woo-non-attacker when target has recently attacked', () => {
    const s = state();
    s.leaders.chump.recentAggressionFrom.player1 = 1;
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'woo', target: 'chump', points: 1 },
    ]);
    expect(warnings.filter((w) => w.kind === 'woo-non-attacker')).toHaveLength(0);
  });

  it('returns empty for a clean plan', () => {
    const s = state();
    s.leaders.player1.stockpile.missiles = 1;
    s.leaders.player1.stockpile.warheadsSmall = 1;
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'build-factory' },
    ]);
    expect(warnings).toEqual([]);
  });
});
