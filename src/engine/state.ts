import type { Difficulty, GameConfig, GameState, Leader, LeaderId } from './types';
import { DOMINANCE_THRESHOLD_DEFAULT, LEADER_PROFILES } from './balance';
import { seedFromString } from './rng';

export interface NewGameOpts {
  cast: LeaderId[];
  difficulty: Difficulty;
  seed: string;
  config?: Partial<GameConfig>;
}

export function initialState(opts: NewGameOpts): GameState {
  const leaders = {} as Record<LeaderId, Leader>;
  for (const id of opts.cast) {
    const profile = LEADER_PROFILES[id];
    const startPop = opts.config?.startPopOverride?.[id] ?? profile.startPop;
    leaders[id] = {
      id,
      name: profile.name,
      country: profile.country,
      population: startPop,
      factories: profile.startFactories,
      stockpile: {
        missiles: 0,
        bombers: 0,
        warheadsSmall: 0,
        warheadsMedium: 0,
        warheadsLarge: 0,
        shields: 0,
        aa: 0,
      },
      ap: profile.startAp,
      apBanked: 0,
      alive: true,
      favourability: {},
      grudge: {},
      recentAggressionFrom: {},
      bonusRule: profile.bonusRule,
    };
  }
  return {
    round: 1,
    cast: [...opts.cast],
    difficulty: opts.difficulty,
    seed: opts.seed,
    rngState: seedFromString(opts.seed),
    leaders,
    pendingOrders: {},
    log: [],
    outcome: null,
    config: {
      dominanceThreshold: DOMINANCE_THRESHOLD_DEFAULT,
      fastPlay: false,
      ...opts.config,
    },
  };
}
