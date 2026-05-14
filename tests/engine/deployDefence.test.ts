import { describe, expect, it } from 'vitest';
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { resolveRound } from '../../src/engine/resolution';

function setup() {
  let s = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'deploy-test',
  });
  s.leaders.player1.stockpile.shields = 1;
  return s;
}

describe('deploy-defence resolution', () => {
  it('deploys one shield: stockpile -1, deployedShields +1', () => {
    let s = setup();
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'player1',
      orders: [{ kind: 'deploy-defence', type: 'shield' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const r = resolveRound(s);
    // Round end clears deployed, so we check the event sequence
    const deployed = r.events.find((e) => e.kind === 'DefenceDeployed');
    expect(deployed).toBeDefined();
    if (deployed && deployed.kind === 'DefenceDeployed') {
      expect(deployed.by).toBe('player1');
      expect(deployed.type).toBe('shield');
    }
    // After round end, stockpile.shields=0 (was 1, deployed used it)
    expect(r.state.leaders.player1.stockpile.shields).toBe(0);
  });

  it('build-then-deploy in one round: stockpile correctly reflects the cycle', () => {
    let s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'build-deploy-cycle',
    });
    s.leaders.player1.ap = 10;
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'player1',
      orders: [
        { kind: 'build-defence', type: 'shield' },
        { kind: 'deploy-defence', type: 'shield' },
      ],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const r = resolveRound(s);
    const builtIdx = r.events.findIndex((e) => e.kind === 'DefenceBuilt');
    const deployedIdx = r.events.findIndex((e) => e.kind === 'DefenceDeployed');
    expect(builtIdx).toBeGreaterThan(-1);
    expect(deployedIdx).toBeGreaterThan(-1);
    // Build event must come BEFORE deploy event in the sequence
    expect(builtIdx).toBeLessThan(deployedIdx);
  });
});
