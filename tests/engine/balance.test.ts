import { describe, it, expect } from 'vitest';
import {
  LEADER_PROFILES,
  ACTION_COSTS,
  YIELD_DAMAGE,
  FACTORY_AP_RATE,
  AP_BANK_CAP,
  PROPAGANDA_TRANSFER_M,
  WOO_FAVOURABILITY_DECAY,
  DOMINANCE_THRESHOLD_DEFAULT,
} from '../../src/engine/balance';

describe('LEADER_PROFILES', () => {
  it('defines a profile for every leader id', () => {
    const ids = Object.keys(LEADER_PROFILES).sort();
    expect(ids).toEqual(
      [
        'carnage', 'chump', 'khameneverhere', 'mileigh-hem',
        'netanyahoo', 'starmless',
        'player1', 'player2', 'player3', 'player4', 'player5',
      ].sort(),
    );
  });

  it('defaults player1 to Rufus T. Firefly / 🦆 Freedonia', () => {
    expect(LEADER_PROFILES.player1.name).toBe('Rufus T. Firefly');
    expect(LEADER_PROFILES.player1.country).toBe('🦆 Freedonia');
    expect(LEADER_PROFILES.player1.startPop).toBe(25);
    expect(LEADER_PROFILES.player1.bonusRule).toBeUndefined();
  });

  it('matches spec starting values', () => {
    expect(LEADER_PROFILES.chump.startPop).toBe(33);
    expect(LEADER_PROFILES.chump.startFactories).toBe(10);
    expect(LEADER_PROFILES.chump.startAp).toBe(10);
    expect(LEADER_PROFILES.khameneverhere.startPop).toBe(28);
    expect(LEADER_PROFILES.starmless.startPop).toBe(25);
    expect(LEADER_PROFILES.carnage.startPop).toBe(25);
    expect(LEADER_PROFILES['mileigh-hem'].startPop).toBe(22);
    expect(LEADER_PROFILES['mileigh-hem'].startFactories).toBe(4);
    expect(LEADER_PROFILES['mileigh-hem'].startAp).toBe(4);
    expect(LEADER_PROFILES.netanyahoo.startPop).toBe(18);
  });

  it('attaches bonus rule keys for the three leaders that have them', () => {
    expect(LEADER_PROFILES.chump.bonusRule).toBe('chump-defence-waste');
    expect(LEADER_PROFILES['mileigh-hem'].bonusRule).toBe('mileigh-aggression-bonus');
    expect(LEADER_PROFILES.netanyahoo.bonusRule).toBe('netanyahoo-launch-bonus');
    expect(LEADER_PROFILES.carnage.bonusRule).toBeUndefined();
  });
});

describe('ACTION_COSTS', () => {
  it('matches spec §4 costs', () => {
    expect(ACTION_COSTS.buildFactory).toBe(3);
    expect(ACTION_COSTS.buildMissile).toBe(1);
    expect(ACTION_COSTS.buildBomber).toBe(1);
    expect(ACTION_COSTS.buildWarheadSmall).toBe(1);
    expect(ACTION_COSTS.buildWarheadMedium).toBe(2);
    expect(ACTION_COSTS.buildWarheadLarge).toBe(3);
    expect(ACTION_COSTS.buildDefence).toBe(4);
    expect(ACTION_COSTS.deployDefence).toBe(4);
    expect(ACTION_COSTS.launch).toBe(2);
    expect(ACTION_COSTS.propaganda).toBe(1);
    expect((ACTION_COSTS as Record<string, number>).woo).toBe(1);
  });
});

describe('YIELD_DAMAGE', () => {
  it('matches spec §6 damage profiles', () => {
    expect(YIELD_DAMAGE.small).toEqual({ peopleDeaths: 2, factoriesDestroyed: 1 });
    expect(YIELD_DAMAGE.medium).toEqual({ peopleDeaths: 6, factoriesDestroyed: 2 });
    expect(YIELD_DAMAGE.large).toEqual({ peopleDeaths: 15, factoriesDestroyed: 3 });
  });
});

describe('economy constants', () => {
  it('matches spec values', () => {
    expect(FACTORY_AP_RATE).toBe(1.0);
    expect(AP_BANK_CAP).toBe(4);
    expect(PROPAGANDA_TRANSFER_M).toBeGreaterThan(0);
    expect(WOO_FAVOURABILITY_DECAY).toBeGreaterThan(0);
    expect(DOMINANCE_THRESHOLD_DEFAULT).toBe(2);
  });
});

describe('balance constants (P4b)', () => {
  it('FACTORY_AP_RATE is 1.0', () => {
    expect(FACTORY_AP_RATE).toBe(1.0);
  });
  it('AP_BANK_CAP is 4', () => {
    expect(AP_BANK_CAP).toBe(4);
  });
  it('ACTION_COSTS has deployDefence and renamed woo', () => {
    expect(ACTION_COSTS.deployDefence).toBe(4);
    expect(ACTION_COSTS.buildDefence).toBe(4);
    expect((ACTION_COSTS as Record<string, number>).woo).toBe(1);
  });
});
