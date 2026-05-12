import { describe, expect, it } from 'vitest';
import { pickLine } from '../../../src/engine/flavor/pick';
import { getBank } from '../../../src/engine/flavor/index';
import { seedFromString } from '../../../src/engine/rng';

describe('pickLine', () => {
  it('is deterministic for the same rngState', () => {
    const bank = getBank('chump')!;
    const r1 = pickLine(bank, 'launch', seedFromString('seed-a'));
    const r2 = pickLine(bank, 'launch', seedFromString('seed-a'));
    expect(r1.quote).toBe(r2.quote);
  });

  it('produces different quotes on different rngStates (sampling)', () => {
    const bank = getBank('chump')!;
    const seeds = ['a', 'b', 'c', 'd', 'e'].map(seedFromString);
    const quotes = new Set(seeds.map((s) => pickLine(bank, 'launch', s).quote));
    expect(quotes.size).toBeGreaterThan(1);
  });

  it('returns the snap-back line when opts.snapBack is true', () => {
    const bank = getBank('chump')!;
    const r = pickLine(bank, 'preRoundMood', seedFromString('any'), { snapBack: true });
    expect(r.quote).toBe(bank.preRoundMoodSnapBack);
  });

  it('threads rngState forward (state changes after a pick)', () => {
    const bank = getBank('chump')!;
    const before = seedFromString('thread-test');
    const r = pickLine(bank, 'launch', before);
    expect(r.rngState).not.toBe(before);
  });

  it('falls back to generic template when category is empty', () => {
    const bank = getBank('netanyahoo')!; // propagandaReceive is []
    const r = pickLine(bank, 'propagandaReceive', seedFromString('any'), {
      substitutions: { leader: 'Netanyahoo' },
    });
    expect(r.quote).toContain('Netanyahoo');
  });

  it('substitutes {target} tokens', () => {
    const bank = getBank('carnage')!;
    const r = pickLine(bank, 'propagandaSend', seedFromString('sub'), {
      substitutions: { target: 'Chump' },
    });
    // carnageBank.propagandaSend includes "{target}'s recent behaviour"
    expect(r.quote).not.toContain('{target}');
  });

  it('filters out lines containing untracked substitution tokens', () => {
    // starmlessBank.launch has lines with {scapegoat}. With no scapegoat substitution,
    // the picker must filter those lines out before drawing.
    const bank = getBank('starmless')!;
    for (const seed of ['x', 'y', 'z'].map(seedFromString)) {
      const r = pickLine(bank, 'launch', seed); // no substitutions
      expect(r.quote).not.toContain('{scapegoat}');
    }
  });
});
