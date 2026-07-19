import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Portrait from '../../src/ui/components/Portrait';
import { extractFlag, stripFlag } from '../../src/ui/portraits';

describe('<Portrait>', () => {
  it('renders an AI leader face SVG with its flag badge', () => {
    const { container, getByText } = render(<Portrait leaderId="chump" size={64} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(getByText('🇺🇸')).toBeInTheDocument();
  });

  it('renders the Groucho disguise for human slots with the supplied flag', () => {
    const { container, getByText } = render(
      <Portrait leaderId="player2" size={64} flag="🦆" />,
    );
    // Groucho face is identifiable by its data marker
    expect(container.querySelector('[data-face="groucho"]')).not.toBeNull();
    expect(getByText('🦆')).toBeInTheDocument();
  });

  it('hides the badge when showBadge is false', () => {
    const { queryByText } = render(
      <Portrait leaderId="chump" size={64} showBadge={false} />,
    );
    expect(queryByText('🇺🇸')).toBeNull();
  });
});

describe('extractFlag', () => {
  it('extracts a regional-indicator flag', () => {
    expect(extractFlag('🇺🇸 US')).toBe('🇺🇸');
  });
  it('extracts a pictographic emoji', () => {
    expect(extractFlag('🦆 Freedonia')).toBe('🦆');
  });
  it('falls back to the globe for plain text', () => {
    expect(extractFlag('Freedonia')).toBe('🌐');
  });
});

describe('stripFlag', () => {
  it('removes a leading regional-indicator flag plus whitespace', () => {
    expect(stripFlag('🇺🇸 US')).toBe('US');
  });
  it('removes a leading pictographic emoji plus whitespace', () => {
    expect(stripFlag('🦆 Freedonia')).toBe('Freedonia');
  });
  it('is the identity on strings with no leading flag', () => {
    expect(stripFlag('Freedonia')).toBe('Freedonia');
  });
});
