import { describe, expect, it } from 'vitest';
import { pickLine } from '../../../src/engine/flavor/pick';
import { getBank, genericFallback } from '../../../src/engine/flavor/index';
import type { FlavorBank } from '../../../src/engine/flavor/index';
import { seedFromString } from '../../../src/engine/rng';

/** Minimal synthetic bank: every category besides `launch` is irrelevant to these tests. */
function makeFixtureBank(launchLines: string[]): FlavorBank {
  const empty: string[] = [];
  return {
    preRoundMood: empty,
    preRoundMoodSnapBack: '(snap back)',
    launch: launchLines,
    hit: empty,
    woo: empty,
    beingWooed: empty,
    propagandaSend: empty,
    propagandaReceive: empty,
    buildFactory: empty,
    buildDefence: empty,
    reaction: empty,
    death: empty,
    finalRetaliation: empty,
  };
}

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
    // Synthetic fixture: one normal line, one line carrying an untracked
    // {scapegoat} token. With no scapegoat substitution supplied, pick.ts's
    // eligible() filter (src/engine/flavor/pick.ts:23-29) must exclude the
    // token-bearing line before drawing, leaving only the normal line.
    const bank = makeFixtureBank(['a normal line', 'blame {scapegoat} for this']);
    for (const seed of ['x', 'y', 'z'].map(seedFromString)) {
      const r = pickLine(bank, 'launch', seed); // no substitutions
      expect(r.quote).toBe('a normal line');
    }
  });

  it('falls back to genericFallback when every line is ineligible', () => {
    // Every candidate line carries an untracked token, so eligible() excludes
    // all of them and pickLine must take the genericFallback path.
    const bank = makeFixtureBank(['blame {scapegoat} for this', 'and {scapegoat} again']);
    const r = pickLine(bank, 'launch', seedFromString('any'));
    expect(r.quote).toBe(genericFallback.launch[0]);
  });
});
