import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApBudget from '../../src/ui/components/ApBudget';

describe('<ApBudget>', () => {
  it('renders the ApMeter readout and bank label', () => {
    render(<ApBudget used={2} max={6} banked={0} />);
    expect(screen.getByText(/\/ 6 AP/)).toBeInTheDocument();
    expect(screen.getByText('4 will bank')).toBeInTheDocument();
  });

  it('shows OVER BUDGET when used exceeds max', () => {
    render(<ApBudget used={7} max={6} banked={0} />);
    expect(screen.getByText('OVER BUDGET')).toBeInTheDocument();
  });

  it('renders the banking note with the cap', () => {
    render(<ApBudget used={0} max={6} banked={0} />);
    expect(screen.getByText(/Banked AP carries over \(cap 4\)\./)).toBeInTheDocument();
    expect(screen.queryByText(/Of which banked/)).not.toBeInTheDocument();
  });

  it('appends the banked amount when banked > 0', () => {
    render(<ApBudget used={0} max={8} banked={2} />);
    expect(screen.getByText(/Of which banked: 2\./)).toBeInTheDocument();
  });
});
