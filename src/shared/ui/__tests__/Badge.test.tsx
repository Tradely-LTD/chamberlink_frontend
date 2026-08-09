import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders the label', () => {
    render(<Badge label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies default variant styling', () => {
    render(<Badge label="Active" />);
    expect(screen.getByText('Active')).toHaveClass('bg-[#023293]/10');
  });

  it('applies coming-soon variant styling', () => {
    render(<Badge label="Soon" variant="coming-soon" />);
    expect(screen.getByText('Soon')).toHaveClass('bg-amber-100');
  });
});
