import { render, screen } from '@testing-library/react';
import ApBudget from '../../src/ui/components/ApBudget';

describe('<ApBudget>', () => {
  it('renders AP available', () => {
    render(<ApBudget ap={5} apBanked={1} />);
    expect(screen.getByText(/AP available/i)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows banked row when apBanked > 0', () => {
    render(<ApBudget ap={5} apBanked={2} />);
    expect(screen.getByText(/banked/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('omits banked row when apBanked is 0', () => {
    render(<ApBudget ap={3} apBanked={0} />);
    expect(screen.queryByText(/banked/i)).not.toBeInTheDocument();
  });
});
