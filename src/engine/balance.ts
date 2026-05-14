import type { BonusRule, LeaderId, Yield } from './types';

export const LEADER_PROFILES: Record<
  LeaderId,
  {
    name: string;
    country: string;
    startPop: number;
    startFactories: number;
    startAp: number;
    bonusRule?: BonusRule;
  }
> = {
  chump: {
    name: 'Chump',
    country: '🇺🇸 US',
    startPop: 33,
    startFactories: 10,
    startAp: 10,
    bonusRule: 'chump-defence-waste',
  },
  khameneverhere: {
    name: 'Khameneverhere',
    country: '🇮🇷 Iran',
    startPop: 28,
    startFactories: 6,
    startAp: 6,
  },
  starmless: {
    name: 'Starmless',
    country: '🇬🇧 UK',
    startPop: 25,
    startFactories: 6,
    startAp: 6,
  },
  carnage: {
    name: 'Carnage',
    country: '🇨🇦 Canada',
    startPop: 25,
    startFactories: 6,
    startAp: 6,
  },
  'mileigh-hem': {
    name: 'Mileigh-hem',
    country: '🇦🇷 Argentina',
    startPop: 22,
    startFactories: 4,
    startAp: 4,
    bonusRule: 'mileigh-aggression-bonus',
  },
  netanyahoo: {
    name: 'Netanyahoo',
    country: '🇮🇱 Israel',
    startPop: 18,
    startFactories: 6,
    startAp: 6,
    bonusRule: 'netanyahoo-launch-bonus',
  },
  player1: {
    name: 'Rufus T. Firefly',
    country: '🦆 Freedonia',
    startPop: 25,
    startFactories: 6,
    startAp: 6,
  },
  player2: {
    name: 'Player 2',
    country: '🦆 Freedonia 2',
    startPop: 25,
    startFactories: 6,
    startAp: 6,
  },
  player3: {
    name: 'Player 3',
    country: '🦆 Freedonia 3',
    startPop: 25,
    startFactories: 6,
    startAp: 6,
  },
  player4: {
    name: 'Player 4',
    country: '🦆 Freedonia 4',
    startPop: 25,
    startFactories: 6,
    startAp: 6,
  },
  player5: {
    name: 'Player 5',
    country: '🦆 Freedonia 5',
    startPop: 25,
    startFactories: 6,
    startAp: 6,
  },
};

export const ACTION_COSTS = {
  buildFactory: 3,
  buildMissile: 1,
  buildBomber: 1,
  buildWarheadSmall: 1,
  buildWarheadMedium: 2,
  buildWarheadLarge: 3,
  buildDefence: 4,
  deployDefence: 4,
  launch: 2,
  propaganda: 1,
  woo: 1,
} as const;

export const YIELD_DAMAGE: Record<
  Yield,
  { peopleDeaths: number; factoriesDestroyed: number }
> = {
  small: { peopleDeaths: 2, factoriesDestroyed: 1 },
  medium: { peopleDeaths: 6, factoriesDestroyed: 2 },
  large: { peopleDeaths: 15, factoriesDestroyed: 3 },
};

export const FACTORY_AP_RATE = 1.0;
export const AP_BANK_CAP = 4;
/** Population (in millions) transferred from victim to propagandist per propaganda order. Tunable. */
export const PROPAGANDA_TRANSFER_M = 1;
/** Favourability points decayed per round per relationship. Tunable. */
export const WOO_FAVOURABILITY_DECAY = 1;
export const DOMINANCE_THRESHOLD_DEFAULT = 2;

/**
 * Per-leader scoring weights. First-pass values; balance-pass deferred to P4.
 * Each personality module reads from this table to compose its own scoring function.
 */
export const AI_SCORING_WEIGHTS = {
  // Threat scoring: how dangerous another leader is to me.
  threat: {
    perMissile: 1,
    perBomber: 1,
    perWarheadSmall: 1,
    perWarheadMedium: 2,
    perWarheadLarge: 4,
    perRecentAggression: 3, // recentAggressionFrom[them] -> their threat to me
  },
  // Opportunism: how vulnerable a target is.
  opportunism: {
    perPopBelow10M: 4,
    perFactoryBelow3: 2,
    perDefenceShield: -1, // defended targets are LESS opportunistic
    perDefenceAa: -1,
  },
  // Carnage's escalation multiplier on attacker's threat next round.
  carnageEscalationMultiplier: 2,
  // Starmless's scapegoat probability on retaliation (35 %).
  starmlessScapegoatPct: 0.35,
  // Mileigh-hem's all-out activation trigger.
  mileighActivationApThreshold: 4,
  // Khameneverhere grudge weight per impact (multiplied by warhead yield index 1/2/4).
  grudgePerImpact: { small: 1, medium: 2, large: 4 } as const,
  // Hard-mode lookahead: outcome scoring constants (see lookahead.ts).
  scoreWinBonus: 1000,
  scoreLossPenalty: -1000,
  scoreApocalypsePenalty: -500,
} as const;
