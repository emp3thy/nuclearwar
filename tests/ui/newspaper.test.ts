import { describe, it, expect } from 'vitest';
import {
  deriveForecast,
  deriveMarket,
  deriveBoxScore,
  deriveStories,
  derivePhotoCaption,
  pickCorrection,
  CORRECTIONS,
} from '../../src/ui/util/newspaper';
import { initialState } from '../../src/engine/state';
import type { LeaderId, ResolutionEvent } from '../../src/engine/types';

function makeGame(cast: LeaderId[]) {
  return initialState({ cast, difficulty: 'normal', seed: 'newspaper-test' });
}

describe('deriveForecast', () => {
  it('maps casualty tiers to outlook and UV count at the boundaries', () => {
    const cases: Array<[number, string, number]> = [
      [0, 'FALLOUT: NONE', 1],
      [1, 'FALLOUT: LIGHT', 2],
      [5, 'FALLOUT: LIGHT', 2],
      [6, 'FALLOUT: HEAVY', 4],
      [14, 'FALLOUT: HEAVY', 4],
      [15, 'FALLOUT: BIBLICAL', 5],
    ];
    for (const [lost, outlook, uv] of cases) {
      const f = deriveForecast(lost);
      expect(f.outlook).toBe(outlook);
      expect(f.uv).toBe(uv);
    }
  });

  it('reports quiet conditions when nothing was lost', () => {
    const f = deriveForecast(0);
    expect(f.temp).toBe('20°');
    expect(f.rows).toEqual([
      { label: 'Fallout', value: 'None reported' },
      { label: 'Visibility', value: 'Unlimited. For now.' },
      { label: 'Wind', value: 'Light breeze' },
      { label: 'Outlook', value: 'Worse. Always worse.' },
    ]);
  });

  it('reports fallout conditions when people were lost', () => {
    const f = deriveForecast(15);
    expect(f.temp).toBe('5,800°');
    expect(f.tempLabel).toBe('surface of the sun, briefly');
    expect(f.rows).toEqual([
      { label: 'Fallout', value: 'Total, drifting everywhere' },
      { label: 'Visibility', value: 'Nil to 200 yards' },
      { label: 'Wind', value: 'Mushroom-shaped' },
      { label: 'Outlook', value: 'Worse. Always worse.' },
    ]);
  });
});

describe('deriveMarket', () => {
  it('computes rounded percent change from prevPopulations', () => {
    const game = makeGame(['player1', 'chump', 'starmless']);
    game.leaders.chump.population = 18;
    const rows = deriveMarket(game, { chump: 33, starmless: 25 });
    const chump = rows.find((r) => r.id === 'chump');
    expect(chump).toBeDefined();
    // (18 - 33) / 33 * 100 = -45.45… → -45
    expect(chump!.change).toBe(-45);
    expect(chump!.arrow).toBe('▼');
    expect(chump!.note).toBe('clobbered');
  });

  it('flat-lines with ▬ 0% when prev is undefined', () => {
    const game = makeGame(['player1', 'chump']);
    const rows = deriveMarket(game, {});
    for (const row of rows) {
      expect(row.change).toBe(0);
      expect(row.arrow).toBe('▬');
      expect(row.note).toBe('holds');
    }
  });

  it('marks dead leaders as delisted and includes them in the listing', () => {
    const game = makeGame(['player1', 'chump', 'carnage']);
    game.leaders.carnage.alive = false;
    game.leaders.carnage.population = 0;
    const rows = deriveMarket(game, { carnage: 25 });
    expect(rows).toHaveLength(3);
    const carnage = rows.find((r) => r.id === 'carnage');
    expect(carnage).toBeDefined();
    expect(carnage!.note).toBe('delisted');
  });

  it('grades down / holds / up notes by change sign', () => {
    const game = makeGame(['chump', 'starmless', 'mileigh-hem']);
    game.leaders.starmless.population = 22; // up from 20
    game.leaders['mileigh-hem'].population = 21; // down from 22
    const rows = deriveMarket(game, {
      chump: game.leaders.chump.population,
      starmless: 20,
      'mileigh-hem': 22,
    });
    expect(rows.find((r) => r.id === 'chump')!.note).toBe('holds');
    const up = rows.find((r) => r.id === 'starmless')!;
    expect(up.arrow).toBe('▲');
    expect(up.note).toBe('up');
    const down = rows.find((r) => r.id === 'mileigh-hem')!;
    expect(down.arrow).toBe('▼');
    expect(down.note).toBe('down');
  });

  it('derives human ticker symbols from the flag-stripped country (first 3 chars)', () => {
    const game = makeGame(['player1', 'chump', 'starmless']);
    const rows = deriveMarket(game, {});
    // player1's default country is '🦆 Freedonia' → FRE (rule, not the mock's FRD)
    expect(rows.find((r) => r.id === 'player1')!.sym).toBe('FRE');
    expect(rows.find((r) => r.id === 'chump')!.sym).toBe('USA');
    expect(rows.find((r) => r.id === 'starmless')!.sym).toBe('UK');
  });
});

describe('deriveBoxScore', () => {
  const game = makeGame(['player1', 'chump', 'carnage', 'khameneverhere']);

  it('maps ImpactPeople, ImpactInfrastructure and MissileIntercepted rows in event order', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'carnage', target: 'chump', warhead: 'large', deaths: 6 },
      { kind: 'ImpactInfrastructure', from: 'chump', target: 'carnage', warhead: 'small', factoriesDestroyed: 2 },
      { kind: 'MissileIntercepted', from: 'khameneverhere', to: 'chump', delivery: 'missile', warhead: 'medium' },
    ];
    const rows = deriveBoxScore(events, game.leaders);
    expect(rows).toEqual([
      { a: 'Carnage', b: 'Chump', score: '−6M', tone: 'harm' },
      { a: 'Chump', b: 'Carnage', score: '−2 fac', tone: 'harm' },
      { a: 'Khameneve.', b: 'Chump', score: 'INTERCEPT', tone: 'good' },
    ]);
  });

  it('truncates names longer than 9 characters to the first 9 chars plus a dot', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'khameneverhere', target: 'chump', warhead: 'small', deaths: 2 },
    ];
    const rows = deriveBoxScore(events, game.leaders);
    // 'Khameneverhere' → first 9 chars 'Khameneve' + '.'
    expect(rows[0].a).toBe('Khameneve.');
  });

  it('returns no rows when nothing qualifies (empty state)', () => {
    const events: ResolutionEvent[] = [
      { kind: 'FactoryBuilt', by: 'chump' },
      { kind: 'PostRoundReaction', leaderId: 'chump', quote: 'fine.' },
    ];
    expect(deriveBoxScore(events, game.leaders)).toEqual([]);
  });
});

describe('deriveStories', () => {
  it('gives DIGS OUT priority over launch headlines when a leader lost ≥10M and launched', () => {
    const game = makeGame(['player1', 'chump', 'carnage']);
    game.leaders.chump.population = 18;
    const events: ResolutionEvent[] = [
      { kind: 'MissileLaunched', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'large', targetType: 'people' },
      { kind: 'ImpactPeople', from: 'carnage', target: 'chump', warhead: 'large', deaths: 15 },
    ];
    const stories = deriveStories(game, events, { player1: game.leaders.player1.population, chump: 33, carnage: game.leaders.carnage.population });
    const chump = stories.find((s) => s.id === 'chump');
    expect(chump).toBeDefined();
    expect(chump!.headline).toBe('CHUMP DIGS OUT, BLAMES EVERYONE');
  });

  it('gives an idle leader the DOES NOTHING headline and the restraint body line', () => {
    const game = makeGame(['player1', 'carnage']);
    const stories = deriveStories(game, [], {
      player1: game.leaders.player1.population,
      carnage: game.leaders.carnage.population,
    });
    const carnage = stories.find((s) => s.id === 'carnage');
    expect(carnage).toBeDefined();
    expect(carnage!.headline).toBe('CARNAGE DOES NOTHING, CALLS IT STRATEGY');
    expect(carnage!.body).toBe('No orders of consequence were filed. Analysts describe the restraint as "suspicious."');
  });

  it('selects the largest loser as lead and orders it first, rest in cast order', () => {
    const game = makeGame(['player1', 'chump', 'carnage']);
    game.leaders.chump.population = 23; // lost 10
    game.leaders.carnage.population = 21; // lost 4
    const stories = deriveStories(game, [], { player1: game.leaders.player1.population, chump: 33, carnage: 25 });
    expect(stories.map((s) => s.id)).toEqual(['chump', 'player1', 'carnage']);
    expect(stories[0].lead).toBe(true);
    expect(stories[1].lead).toBe(false);
    expect(stories[2].lead).toBe(false);
  });

  it('falls back to the first living cast member as lead when nobody lost population', () => {
    const game = makeGame(['player1', 'chump', 'carnage']);
    const prev = {
      player1: game.leaders.player1.population,
      chump: game.leaders.chump.population,
      carnage: game.leaders.carnage.population,
    };
    const stories = deriveStories(game, [], prev);
    expect(stories.map((s) => s.id)).toEqual(['player1', 'chump', 'carnage']);
    expect(stories[0].lead).toBe(true);
  });

  it('excludes dead leaders from the story flow', () => {
    const game = makeGame(['player1', 'chump', 'carnage']);
    game.leaders.chump.alive = false;
    game.leaders.chump.population = 0;
    const stories = deriveStories(game, [], {});
    expect(stories.map((s) => s.id)).toEqual(['player1', 'carnage']);
  });

  it('uses static AI datelines and flag-stripped uppercase country for humans', () => {
    const game = makeGame(['player1', 'chump', 'khameneverhere']);
    const stories = deriveStories(game, [], {});
    expect(stories.find((s) => s.id === 'chump')!.kicker).toBe('MAR-A-LAGO');
    expect(stories.find((s) => s.id === 'khameneverhere')!.kicker).toBe('LOCATION UNDISCLOSED');
    expect(stories.find((s) => s.id === 'player1')!.kicker).toBe('FREEDONIA');
  });

  it('names a single attacker in the strike body line and caps the body at three sentences', () => {
    const game = makeGame(['player1', 'chump', 'carnage']);
    game.leaders.chump.population = 27;
    game.leaders.chump.factories = 1;
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'carnage', target: 'chump', warhead: 'medium', deaths: 6 },
      { kind: 'ImpactInfrastructure', from: 'carnage', target: 'chump', warhead: 'small', factoriesDestroyed: 1 },
      { kind: 'MissileIntercepted', from: 'player1', to: 'chump', delivery: 'missile', warhead: 'small' },
      { kind: 'MissileLaunched', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const story = deriveStories(game, events, { chump: 33 }).find((s) => s.id === 'chump');
    expect(story).toBeDefined();
    expect(story!.body).toBe(
      'A strike from Carnage removed 6 million citizens from the census. ' +
      '1 factory now qualifies as open-plan. ' +
      'Air defences held; one incoming warhead retired over open water.',
    );
  });

  it('reports byline deltas and badges from population change and events', () => {
    const game = makeGame(['player1', 'chump']);
    game.leaders.chump.population = 27;
    game.leaders.chump.apBanked = 2;
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'player1', target: 'chump', warhead: 'medium', deaths: 6 },
      { kind: 'FactoryBuilt', by: 'chump' },
      { kind: 'PostRoundReaction', leaderId: 'chump', quote: 'Tremendous.' },
    ];
    const story = deriveStories(game, events, { chump: 33 }).find((s) => s.id === 'chump');
    expect(story).toBeDefined();
    expect(story!.delta).toEqual({ text: '33M → 27M', kind: 'harm' });
    expect(story!.pullquote).toBe('Tremendous.');
    expect(story!.badges).toEqual([
      { kind: 'harm', text: '−6M citizens' },
      { kind: 'gain', text: '+1 factory' },
      { kind: 'neutral', text: 'banked 2 AP' },
    ]);
  });
});

describe('derivePhotoCaption', () => {
  const game = makeGame(['player1', 'chump', 'carnage']);

  it('names the target country of the biggest summed attacker→target pairing', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'carnage', target: 'chump', warhead: 'large', deaths: 9 },
      { kind: 'ImpactPeople', from: 'carnage', target: 'player1', warhead: 'medium', deaths: 4 },
      { kind: 'ImpactPeople', from: 'carnage', target: 'player1', warhead: 'medium', deaths: 6 },
    ];
    // carnage→player1 sums to 10, beating carnage→chump's 9.
    expect(derivePhotoCaption(events, game.leaders)).toBe(
      "Eyewitness sketch of the impact zone over Freedonia. Artist's impression.",
    );
  });

  it('falls back to the file-photo line when nobody died', () => {
    expect(derivePhotoCaption([], game.leaders)).toBe(
      'File photo of a previous detonation. Nothing exploded tonight. Cherish it.',
    );
  });
});

describe('pickCorrection', () => {
  it('rotates through the three corrections by reported round', () => {
    expect(CORRECTIONS).toHaveLength(3);
    expect(pickCorrection(1)).toBe(CORRECTIONS[0]);
    expect(pickCorrection(2)).toBe(CORRECTIONS[1]);
    expect(pickCorrection(3)).toBe(CORRECTIONS[2]);
    expect(pickCorrection(4)).toBe(CORRECTIONS[0]);
  });
});
