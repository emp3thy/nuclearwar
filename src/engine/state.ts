import type { Difficulty, GameConfig, GameState, Leader, LeaderId } from './types';
import { DOMINANCE_THRESHOLD_DEFAULT, LEADER_PROFILES } from './balance';
import { seedFromString } from './rng';

export interface NewGameOpts {
  cast: LeaderId[];
  difficulty: Difficulty;
  seed: string;
  config?: Partial<GameConfig>;
}

/** Returns true for human player slots ('player1'..'player5'); false for the six AI character ids. Derived from the LeaderId — no stored field. */
export function isHuman(id: LeaderId): boolean {
  return id.startsWith('player');
}

export function initialState(opts: NewGameOpts): GameState {
  const leaders = {} as Record<LeaderId, Leader>;
  for (const id of opts.cast) {
    const profile = LEADER_PROFILES[id];
    const startPop = opts.config?.startPopOverride?.[id] ?? profile.startPop;
    const playerOverride = opts.config?.playerProfiles?.[id];
    leaders[id] = {
      id,
      name: playerOverride?.name ?? profile.name,
      country: playerOverride?.country ?? profile.country,
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
    lastOrders: {},
    log: [],
    outcome: null,
    config: {
      dominanceThreshold: DOMINANCE_THRESHOLD_DEFAULT,
      fastPlay: false,
      ...opts.config,
    },
  };
}
