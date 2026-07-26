import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import WorldMap, { actorOf, receiversOf } from '../../src/ui/components/WorldMap';
import { initialState } from '../../src/engine/state';
import type { GameState, LeaderId, ResolutionEvent } from '../../src/engine/types';

function makeGame(cast: LeaderId[] = ['player1', 'chump', 'carnage']): GameState {
  return initialState({
    cast,
    difficulty: 'normal',
    seed: 'world-map-test',
    config: {
      playerProfiles: { player1: { name: 'Rufus T. Firefly', country: '🦆 Duckland' } },
    },
  });
}

function markerEllipse(container: HTMLElement, id: string): SVGEllipseElement {
  const el = container.querySelector(`[data-leader="${id}"] ellipse`);
  expect(el).not.toBeNull();
  return el as SVGEllipseElement;
}

describe('<WorldMap>', () => {
  it('renders markers for cast members only', () => {
    const { container } = render(<WorldMap game={makeGame()} />);
    expect(container.querySelector('[data-leader="chump"]')).not.toBeNull();
    expect(container.querySelector('[data-leader="carnage"]')).not.toBeNull();
    expect(container.querySelector('[data-leader="player1"]')).not.toBeNull();
    // Not in the cast:
    expect(container.querySelector('[data-leader="burnem"]')).toBeNull();
    expect(container.querySelector('[data-leader="netanyahoo"]')).toBeNull();
  });

  it('fills non-actor AI ellipses with a concrete PORTRAIT_META hex, never an undefined var()', () => {
    const { container } = render(<WorldMap game={makeGame()} />);
    const chumpFill = markerEllipse(container, 'chump').getAttribute('fill');
    const carnageFill = markerEllipse(container, 'carnage').getAttribute('fill');
    expect(chumpFill).toBe('#d6293f');
    expect(carnageFill).toBe('#b22535');
    expect(chumpFill).toMatch(/^#[0-9a-f]{6}$/i);
    expect(carnageFill).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('fills human slots with the per-slot accent var at half opacity', () => {
    const { container } = render(<WorldMap game={makeGame()} />);
    const el = markerEllipse(container, 'player1');
    expect(el.getAttribute('fill')).toBe('var(--cyan)');
    expect(el.getAttribute('opacity')).toBe('0.5');
  });

  it('highlights the actor green and the receiver magenta at 0.85 opacity', () => {
    const { container } = render(
      <WorldMap
        game={makeGame()}
        event={{
          kind: 'MissileLaunched', from: 'chump', to: 'carnage',
          delivery: 'missile', warhead: 'large', targetType: 'people',
        }}
      />,
    );
    const actor = markerEllipse(container, 'chump');
    const receiver = markerEllipse(container, 'carnage');
    expect(actor.getAttribute('fill')).toBe('var(--green)');
    expect(actor.getAttribute('opacity')).toBe('0.85');
    expect(receiver.getAttribute('fill')).toBe('var(--magenta)');
    expect(receiver.getAttribute('opacity')).toBe('0.85');
    // Rocket at the arc apex.
    expect(container.textContent).toContain('🚀');
  });

  it('derives human labels from the live country string, AI labels from COUNTRY_POS', () => {
    const { getByText } = render(<WorldMap game={makeGame()} />);
    expect(getByText('DUCKLAND')).toBeInTheDocument();
    expect(getByText('USA')).toBeInTheDocument();
    expect(getByText('CANADA')).toBeInTheDocument();
  });

  it('renders the intercept shield at the apex and no impact rings', () => {
    const { container } = render(
      <WorldMap
        game={makeGame()}
        event={{ kind: 'MissileIntercepted', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'small' }}
      />,
    );
    expect(container.textContent).toContain('🛡');
    // Impact rings are dashed magenta ellipses rx=13/17 — absent on intercepts.
    expect(container.querySelector('ellipse[rx="13"]')).toBeNull();
    expect(container.querySelector('ellipse[rx="17"]')).toBeNull();
  });

  it('renders the propaganda trail with the paper icon', () => {
    const { container } = render(
      <WorldMap
        game={makeGame()}
        event={{ kind: 'PropagandaTransfer', from: 'chump', to: 'carnage', amount: 2 }}
      />,
    );
    expect(container.textContent).toContain('📃');
    expect(container.querySelector('path[stroke="var(--cyan)"]')).not.toBeNull();
  });

  it('renders the woo trail re-stroked green with the handshake icon', () => {
    const { container } = render(
      <WorldMap
        game={makeGame()}
        event={{ kind: 'WooApplied', from: 'chump', to: 'carnage', points: 1 }}
      />,
    );
    expect(container.textContent).toContain('🤝');
    expect(container.querySelector('path[stroke="var(--green)"][stroke-dasharray="2 1.5"]')).not.toBeNull();
  });

  it('renders the build icon above the actor for build events', () => {
    const { container } = render(
      <WorldMap game={makeGame()} event={{ kind: 'WarheadBuilt', by: 'chump', yield: 'large' }} />,
    );
    expect(container.textContent).toContain('☢');
  });

  it('renders one arc + rings per target for FinalRetaliationTriggered', () => {
    const { container } = render(
      <WorldMap
        game={makeGame()}
        event={{ kind: 'FinalRetaliationTriggered', by: 'chump', targets: ['carnage', 'player1'] }}
      />,
    );
    // Two targets → two sets of impact rings.
    expect(container.querySelectorAll('ellipse[rx="13"]')).toHaveLength(2);
    // Both targets highlighted magenta.
    expect(markerEllipse(container, 'carnage').getAttribute('fill')).toBe('var(--magenta)');
    expect(markerEllipse(container, 'player1').getAttribute('fill')).toBe('var(--magenta)');
  });
});

describe('actorOf / receiversOf', () => {
  it('maps by-only kinds to actor with no receivers', () => {
    expect(actorOf({ kind: 'FactoryBuilt', by: 'chump' })).toBe('chump');
    expect(receiversOf({ kind: 'FactoryBuilt', by: 'chump' })).toEqual([]);
    expect(actorOf({ kind: 'DefenceDeployed', by: 'carnage', type: 'shield' })).toBe('carnage');
  });

  it('maps from/to and from/target kinds', () => {
    const launch: ResolutionEvent = {
      kind: 'MissileLaunched', from: 'chump', to: 'carnage',
      delivery: 'missile', warhead: 'small', targetType: 'people',
    };
    expect(actorOf(launch)).toBe('chump');
    expect(receiversOf(launch)).toEqual(['carnage']);
    const impact: ResolutionEvent = {
      kind: 'ImpactPeople', from: 'chump', target: 'carnage', warhead: 'small', deaths: 3,
    };
    expect(actorOf(impact)).toBe('chump');
    expect(receiversOf(impact)).toEqual(['carnage']);
  });

  it('maps LeaderEliminated to a receiver-only highlight', () => {
    expect(actorOf({ kind: 'LeaderEliminated', id: 'carnage' })).toBeUndefined();
    expect(receiversOf({ kind: 'LeaderEliminated', id: 'carnage' })).toEqual(['carnage']);
  });

  it('maps FinalRetaliationTriggered to every target', () => {
    const e: ResolutionEvent = { kind: 'FinalRetaliationTriggered', by: 'chump', targets: ['carnage', 'player1'] };
    expect(actorOf(e)).toBe('chump');
    expect(receiversOf(e)).toEqual(['carnage', 'player1']);
  });
});
