import { describe, expect, it } from 'vitest';
import { buildPlaybackSteps } from '../../src/ui/screens/Action';
import type { ResolutionEvent } from '../../src/engine/types';

describe('buildPlaybackSteps', () => {
  it('assigns phases via the cursor and flattens in PHASE_ORDER', () => {
    const events: ResolutionEvent[] = [
      { kind: 'DefenceDeployed', by: 'chump', type: 'shield' },
      { kind: 'FactoryBuilt', by: 'carnage' },
      { kind: 'FactoryBuilt', by: 'carnage' },
      { kind: 'PropagandaTransfer', from: 'chump', to: 'carnage', amount: 1 },
      { kind: 'WooApplied', from: 'carnage', to: 'chump', points: 1 },
      { kind: 'MissileLaunched', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'large', targetType: 'people' },
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'large', deaths: 5 },
      { kind: 'LeaderEliminated', id: 'carnage' },
      { kind: 'FinalRetaliationTriggered', by: 'carnage', targets: ['chump'] },
    ];
    const steps = buildPlaybackSteps(events);
    expect(steps.map((s) => [s.phase, s.event.kind, s.count])).toEqual([
      ['DEFENCES', 'DefenceDeployed', 1],
      ['BUILDS', 'FactoryBuilt', 2],
      ['PROPAGANDA', 'PropagandaTransfer', 1],
      ['WOOING', 'WooApplied', 1],
      ['LAUNCHES', 'MissileLaunched', 1],
      ['LAUNCHES', 'ImpactPeople', 1],
      ['LAUNCHES', 'LeaderEliminated', 1],  // inherits the cursor's phase
      ['FINAL_RETALIATIONS', 'FinalRetaliationTriggered', 1],
    ]);
  });

  it('excludes every non-renderable kind', () => {
    const events: ResolutionEvent[] = [
      { kind: 'OrdersSealed', leaderId: 'chump', orderCount: 2 },
      { kind: 'PreRoundMood', leaderId: 'chump', quote: 'Hm.', snapBack: false },
      { kind: 'DefenceConsumed', by: 'chump', type: 'shield' },
      { kind: 'PostRoundReaction', leaderId: 'chump', quote: 'Hm.' },
      { kind: 'OutcomeReached', outcome: { type: 'apocalypse' } },
      { kind: 'DisparageColumn', quote: 'Pint.', footer: 'Allegedly.' },
    ];
    expect(buildPlaybackSteps(events)).toEqual([]);
  });

  it('never emits a DisparageCameo step; the cameo rides on its matching impact step', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'large', deaths: 5 },
      { kind: 'DisparageCameo', afterImpact: { from: 'chump', to: 'carnage' }, quote: 'Pint?' },
    ];
    const steps = buildPlaybackSteps(events);
    expect(steps).toHaveLength(1);
    expect(steps[0].event.kind).toBe('ImpactPeople');
    expect(steps[0].cameo).toEqual({
      kind: 'DisparageCameo',
      afterImpact: { from: 'chump', to: 'carnage' },
      quote: 'Pint?',
    });
  });

  it('attaches a cameo that followed a duplicate impact to the surviving collapsed step', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'small', deaths: 3 },
      { kind: 'ImpactPeople', from: 'burnem', target: 'carnage', warhead: 'small', deaths: 4 },
      // Duplicate (target, attacker) pair — groupPhaseEvents folds it into the first.
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'small', deaths: 2 },
      { kind: 'DisparageCameo', afterImpact: { from: 'chump', to: 'carnage' }, quote: 'Shambles.' },
    ];
    const steps = buildPlaybackSteps(events);
    expect(steps).toHaveLength(2);
    // Summed deaths on the collapsed step, cameo attached there.
    expect(steps[0].event).toMatchObject({ kind: 'ImpactPeople', from: 'chump', target: 'carnage', deaths: 5 });
    expect(steps[0].cameo?.quote).toBe('Shambles.');
    expect(steps[1].cameo).toBeUndefined();
  });

  it('drops a cameo whose afterImpact pair matches no step', () => {
    const events: ResolutionEvent[] = [
      { kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'small', deaths: 3 },
      { kind: 'DisparageCameo', afterImpact: { from: 'burnem', to: 'chump' }, quote: 'Nobody asked.' },
    ];
    const steps = buildPlaybackSteps(events);
    expect(steps).toHaveLength(1);
    expect(steps.map((s) => s.cameo)).toEqual([undefined]);
  });

  it('groups non-adjacent builds per (leader, item) within a phase', () => {
    const events: ResolutionEvent[] = [
      { kind: 'WarheadBuilt', by: 'chump', yield: 'small' },
      { kind: 'DeliveryBuilt', by: 'chump', type: 'missile' },
      { kind: 'WarheadBuilt', by: 'chump', yield: 'small' },
    ];
    const steps = buildPlaybackSteps(events);
    expect(steps.map((s) => [s.event.kind, s.count])).toEqual([
      ['WarheadBuilt', 2],
      ['DeliveryBuilt', 1],
    ]);
  });
});
