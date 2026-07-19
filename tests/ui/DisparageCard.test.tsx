import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import DisparageCard from '../../src/ui/components/DisparageCard';

const event = {
  kind: 'DisparageCameo',
  afterImpact: { from: 'chump', to: 'carnage' },
  quote: 'Disgraceful. Anyway, off to America again.',
} as const;

describe('<DisparageCard>', () => {
  it('renders the FROM CLACTON tag with the beer glass', () => {
    const { getByText } = render(<DisparageCard event={event} />);
    expect(getByText('🍺 FROM CLACTON')).toBeInTheDocument();
  });

  it('renders the engine-provided quote', () => {
    const { getByText } = render(<DisparageCard event={event} />);
    expect(getByText('Disgraceful. Anyway, off to America again.')).toBeInTheDocument();
  });

  it('renders the 56px Disparage portrait', () => {
    const { container } = render(<DisparageCard event={event} />);
    const disc = container.querySelector('span[style*="width: 56px"]');
    expect(disc).not.toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
