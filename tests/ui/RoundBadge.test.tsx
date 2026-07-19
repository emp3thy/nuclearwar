import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoundBadge } from '../../src/ui/components/comic';

describe('<RoundBadge>', () => {
  it('renders the default label and round number', () => {
    render(<RoundBadge round={7} />);
    expect(screen.getByText('Round')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<RoundBadge round={2} label="Turn" />);
    expect(screen.getByText('Turn')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
