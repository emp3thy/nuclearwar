import { describe, expect, it } from 'vitest';
import { initialState } from '../../src/engine/state';
import type { GameState, ResolutionEvent } from '../../src/engine/types';
import { deriveAwards, humanDemiseLine } from '../../src/ui/util/demise';

const CAST = ['player1', 'chump', 'carnage'] as const;

function makeGame(log: ResolutionEvent[], overrides: Partial<GameState> = {}): GameState {
  const game = initialState({ cast: [...CAST], difficulty: 'normal', seed: 'demise-test' });
  game.log = log;
  return { ...game, ...overrides };
}

function findAward(awards: ReturnType<typeof deriveAwards>, title: string) {
  return awards.find((a) => a.title === title);
}

describe('deriveAwards', () => {
  it('awards DEADLIEST to the leader with the highest summed ImpactPeople deaths', () => {
    const game = makeGame([
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'small', deaths: 5 },
      { kind: 'ImpactPeople', from: 'carnage', target: 'chump', warhead: 'medium', deaths: 10 },
    ]);
    const awards = deriveAwards(game, {});
    const deadliest = findAward(awards, 'DEADLIEST');
    expect(deadliest).toBeDefined();
    expect(deadliest!.leaderId).toBe('carnage');
  });

  it('awards BIGGEST BANG to the leader who landed the largest-yield impact', () => {
    const game = makeGame([
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'medium', deaths: 1 },
      { kind: 'ImpactInfrastructure', from: 'carnage', target: 'chump', warhead: 'large', factoriesDestroyed: 2 },
    ]);
    const awards = deriveAwards(game, {});
    const biggestBang = findAward(awards, 'BIGGEST BANG');
    expect(biggestBang).toBeDefined();
    expect(biggestBang!.leaderId).toBe('carnage');
  });

  it('awards TRIGGER HAPPY to the leader with the most MissileLaunched events', () => {
    const game = makeGame([
      { kind: 'MissileLaunched', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
      { kind: 'MissileLaunched', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
      { kind: 'MissileLaunched', from: 'carnage', to: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ]);
    const awards = deriveAwards(game, {});
    const triggerHappy = findAward(awards, 'TRIGGER HAPPY');
    expect(triggerHappy).toBeDefined();
    expect(triggerHappy!.leaderId).toBe('chump');
  });

  it('awards DIED FIRST to the id of the first LeaderEliminated event in log order', () => {
    const game = makeGame([
      { kind: 'LeaderEliminated', id: 'chump' },
      { kind: 'LeaderEliminated', id: 'carnage' },
    ]);
    // chump is not first in cast order (player1 is) — this proves log order, not cast order, drives the award.
    const awards = deriveAwards(game, {});
    const diedFirst = findAward(awards, 'DIED FIRST');
    expect(diedFirst).toBeDefined();
    expect(diedFirst!.leaderId).toBe('chump');
  });

  it('awards LAST TO FALL to outcome.winner for a pyrrhic outcome', () => {
    const game = makeGame([], { outcome: { type: 'pyrrhic', winner: 'chump' } });
    const awards = deriveAwards(game, {});
    const lastToFall = findAward(awards, 'LAST TO FALL');
    expect(lastToFall).toBeDefined();
    expect(lastToFall!.leaderId).toBe('chump');
    expect(findAward(awards, 'LAST ONE STANDING')).toBeUndefined();
  });

  it('awards LAST ONE STANDING to outcome.winner for a survivor outcome', () => {
    const game = makeGame([], { outcome: { type: 'survivor', winner: 'carnage' } });
    const awards = deriveAwards(game, {});
    const lastOneStanding = findAward(awards, 'LAST ONE STANDING');
    expect(lastOneStanding).toBeDefined();
    expect(lastOneStanding!.leaderId).toBe('carnage');
    expect(findAward(awards, 'LAST TO FALL')).toBeUndefined();
  });

  it('awards neither LAST TO FALL nor LAST ONE STANDING for an apocalypse outcome', () => {
    const game = makeGame([], { outcome: { type: 'apocalypse' } });
    const awards = deriveAwards(game, {});
    expect(findAward(awards, 'LAST TO FALL')).toBeUndefined();
    expect(findAward(awards, 'LAST ONE STANDING')).toBeUndefined();
  });

  it('breaks ties by cast order (player1, chump, carnage)', () => {
    const game = makeGame([
      { kind: 'ImpactPeople', from: 'chump', target: 'player1', warhead: 'small', deaths: 5 },
      { kind: 'ImpactPeople', from: 'carnage', target: 'player1', warhead: 'small', deaths: 5 },
    ]);
    const awards = deriveAwards(game, {});
    const deadliest = findAward(awards, 'DEADLIEST');
    expect(deadliest).toBeDefined();
    expect(deadliest!.leaderId).toBe('chump');
  });

  it('omits TRIGGER HAPPY when the log has no MissileLaunched events', () => {
    const game = makeGame([
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'small', deaths: 1 },
    ]);
    const awards = deriveAwards(game, {});
    expect(findAward(awards, 'TRIGGER HAPPY')).toBeUndefined();
  });

  it('returns no log-derived awards for an empty log and apocalypse outcome', () => {
    const game = makeGame([], { outcome: { type: 'apocalypse' } });
    const awards = deriveAwards(game, {});
    expect(awards).toEqual([]);
  });
});

describe('humanDemiseLine', () => {
  it('describes a survived fate', () => {
    const game = makeGame([
      { kind: 'ImpactPeople', from: 'player1', target: 'chump', warhead: 'small', deaths: 2 },
    ], { outcome: { type: 'survivor', winner: 'player1' } });
    game.leaders.player1.alive = true;
    game.leaders.player1.population = 20;
    const line = humanDemiseLine(game, { player1: 25 }, 'player1');
    expect(line).toContain('survived');
    expect(line).toContain('5M');
    expect(line).toContain('25M');
  });

  it('describes an eliminated fate', () => {
    const game = makeGame([
      { kind: 'ImpactPeople', from: 'chump', target: 'player1', warhead: 'small', deaths: 25 },
    ], { outcome: { type: 'survivor', winner: 'chump' } });
    game.leaders.player1.alive = false;
    game.leaders.player1.population = 0;
    const line = humanDemiseLine(game, { player1: 25 }, 'player1');
    expect(line).toContain('eliminated');
    expect(line).toContain('25M');
  });

  it('describes a pyrrhic last-to-fall fate', () => {
    const game = makeGame([
      { kind: 'ImpactPeople', from: 'player1', target: 'chump', warhead: 'small', deaths: 3 },
      { kind: 'ImpactPeople', from: 'chump', target: 'player1', warhead: 'small', deaths: 25 },
    ], { outcome: { type: 'pyrrhic', winner: 'player1' } });
    game.leaders.player1.alive = false;
    game.leaders.player1.population = 0;
    const line = humanDemiseLine(game, { player1: 25 }, 'player1');
    expect(line).toContain('last to fall');
    expect(line).toContain('25M');
  });
});
