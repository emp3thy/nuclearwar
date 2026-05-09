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
    startAp: 5,
    bonusRule: 'chump-defence-waste',
  },
  khameneverhere: {
    name: 'Khameneverhere',
    country: '🇮🇷 Iran',
    startPop: 28,
    startFactories: 6,
    startAp: 3,
  },
  starmless: {
    name: 'Starmless',
    country: '🇬🇧 UK',
    startPop: 25,
    startFactories: 6,
    startAp: 3,
  },
  carnage: {
    name: 'Carnage',
    country: '🇨🇦 Canada',
    startPop: 25,
    startFactories: 6,
    startAp: 3,
  },
  'mileigh-hem': {
    name: 'Mileigh-hem',
    country: '🇦🇷 Argentina',
    startPop: 22,
    startFactories: 4,
    startAp: 2,
    bonusRule: 'mileigh-aggression-bonus',
  },
  netanyahoo: {
    name: 'Netanyahoo',
    country: '🇮🇱 Israel',
    startPop: 18,
    startFactories: 6,
    startAp: 3,
    bonusRule: 'netanyahoo-launch-bonus',
  },
};

export const ACTION_COSTS = {
  buildFactory: 3,
  buildMissile: 1,
  buildBomber: 1,
  buildWarheadSmall: 1,
  buildWarheadMedium: 2,
  buildWarheadLarge: 3,
  buildDefence: 2,
  launch: 2,
  propaganda: 1,
  wooPerPoint: 1,
} as const;

export const YIELD_DAMAGE: Record<
  Yield,
  { peopleDeaths: number; factoriesDestroyed: number }
> = {
  small: { peopleDeaths: 2, factoriesDestroyed: 1 },
  medium: { peopleDeaths: 6, factoriesDestroyed: 2 },
  large: { peopleDeaths: 15, factoriesDestroyed: 3 },
};

export const FACTORY_AP_RATE = 0.5;
export const AP_BANK_CAP = 2;
/** Population (in millions) transferred from victim to propagandist per propaganda order. Tunable. */
export const PROPAGANDA_TRANSFER_M = 1;
/** Favourability points decayed per round per relationship. Tunable. */
export const WOO_FAVOURABILITY_DECAY = 1;
export const DOMINANCE_THRESHOLD_DEFAULT = 2;
