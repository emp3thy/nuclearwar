import { describe, expect, it } from 'vitest';
import { formatEventText } from '../../src/ui/util/eventText';
import { initialState } from '../../src/engine/state';

const game = initialState({
  cast: ['player1', 'chump', 'carnage'],
  difficulty: 'normal',
  seed: 'event-text-test',
});

describe('formatEventText', () => {
  it('formats FactoryBuilt with count pluralisation and quote', () => {
    const one = formatEventText({ kind: 'FactoryBuilt', by: 'chump', quote: 'Tremendous.' }, game, 1);
    expect(one).toEqual({
      icon: '⚙',
      body: '🇺🇸 Chump builds 1 factory',
      quote: 'Tremendous.',
    });
    const three = formatEventText({ kind: 'FactoryBuilt', by: 'chump' }, game, 3);
    expect(three?.body).toBe('🇺🇸 Chump builds 3 factories');
  });

  it('formats DeliveryBuilt with missile vs bomber icons', () => {
    expect(formatEventText({ kind: 'DeliveryBuilt', by: 'chump', type: 'missile' }, game, 2)).toEqual({
      icon: '🚀',
      body: '🇺🇸 Chump builds 2 missiles',
    });
    expect(formatEventText({ kind: 'DeliveryBuilt', by: 'chump', type: 'bomber' }, game, 1)?.icon).toBe('🛩');
  });

  it('formats WarheadBuilt with yield', () => {
    expect(formatEventText({ kind: 'WarheadBuilt', by: 'carnage', yield: 'medium' }, game, 2)).toEqual({
      icon: '☢',
      body: '🇨🇦 Carnage builds 2 medium warheads',
    });
  });

  it('formats DefenceBuilt for shields and AA', () => {
    expect(formatEventText({ kind: 'DefenceBuilt', by: 'chump', type: 'shield' }, game, 2)?.body)
      .toBe('🇺🇸 Chump builds 2 shields');
    expect(formatEventText({ kind: 'DefenceBuilt', by: 'chump', type: 'aa' }, game, 1)?.body)
      .toBe('🇺🇸 Chump builds 1 AA');
  });

  it('formats PropagandaTransfer and merges sender/receiver quotes', () => {
    const r = formatEventText({
      kind: 'PropagandaTransfer', from: 'chump', to: 'carnage', amount: 2,
      senderQuote: 'Read it.', receiverQuote: 'No.',
    }, game);
    expect(r).toEqual({
      icon: '📰',
      body: '🇺🇸 → 🇨🇦 · 2M transferred',
      quote: 'Read it. — No.',
    });
    const noQuotes = formatEventText({ kind: 'PropagandaTransfer', from: 'chump', to: 'carnage', amount: 1 }, game);
    expect(noQuotes?.quote).toBeUndefined();
  });

  it('formats WooApplied', () => {
    expect(formatEventText({ kind: 'WooApplied', from: 'carnage', to: 'chump', points: 1 }, game)?.body)
      .toBe('🇨🇦 woos 🇺🇸 · 1 points');
  });

  it('formats MissileLaunched with the attacker quote', () => {
    const r = formatEventText({
      kind: 'MissileLaunched', from: 'chump', to: 'carnage',
      delivery: 'missile', warhead: 'large', targetType: 'people', attackerQuote: 'Bye.',
    }, game);
    expect(r).toEqual({
      icon: '🚀',
      body: '🇺🇸 → 🇨🇦 (large · people)',
      quote: 'Bye.',
    });
  });

  it('formats MissileIntercepted', () => {
    expect(formatEventText({
      kind: 'MissileIntercepted', from: 'chump', to: 'carnage', delivery: 'bomber', warhead: 'small',
    }, game)?.body).toBe("Chump's bomber to Carnage intercepted");
  });

  it('formats ImpactPeople and ImpactInfrastructure', () => {
    expect(formatEventText({
      kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'large', deaths: 5, targetQuote: 'Ouch.',
    }, game)).toEqual({
      icon: '☠️',
      body: '🇨🇦 Carnage ─ 5M deaths (from 🇺🇸)',
      quote: 'Ouch.',
    });
    expect(formatEventText({
      kind: 'ImpactInfrastructure', from: 'chump', target: 'carnage', warhead: 'small', factoriesDestroyed: 2,
    }, game)?.body).toBe('🇨🇦 Carnage ─ 2 factories destroyed');
  });

  it('formats LeaderEliminated without a className field', () => {
    const r = formatEventText({ kind: 'LeaderEliminated', id: 'carnage', quote: 'Elbows down.' }, game);
    expect(r).toEqual({
      icon: '⬛',
      body: 'Carnage eliminated',
      quote: 'Elbows down.',
    });
  });

  it('formats DefenceDeployed and FinalRetaliationTriggered', () => {
    expect(formatEventText({ kind: 'DefenceDeployed', by: 'chump', type: 'shield' }, game)?.body)
      .toBe('🇺🇸 Chump deploys a shield');
    expect(formatEventText({
      kind: 'FinalRetaliationTriggered', by: 'chump', targets: ['carnage', 'player1'], quote: 'EVERYTHING.',
    }, game)?.body).toBe('🇺🇸 launches Final Retaliation at 🇨🇦, 🦆');
  });

  it('returns null for every kind not rendered on Action', () => {
    expect(formatEventText({ kind: 'OrdersSealed', leaderId: 'chump', orderCount: 3 }, game)).toBeNull();
    expect(formatEventText({ kind: 'DefenceConsumed', by: 'chump', type: 'shield' }, game)).toBeNull();
    expect(formatEventText({ kind: 'OutcomeReached', outcome: { type: 'apocalypse' } }, game)).toBeNull();
    expect(formatEventText({ kind: 'PreRoundMood', leaderId: 'chump', quote: 'Hm.', snapBack: false }, game)).toBeNull();
    expect(formatEventText({ kind: 'PostRoundReaction', leaderId: 'chump', quote: 'Hm.' }, game)).toBeNull();
    expect(formatEventText({
      kind: 'DisparageCameo', afterImpact: { from: 'chump', to: 'carnage' }, quote: 'Pint?',
    }, game)).toBeNull();
    expect(formatEventText({ kind: 'DisparageColumn', quote: 'Pint.', footer: 'Allegedly.' }, game)).toBeNull();
  });
});
