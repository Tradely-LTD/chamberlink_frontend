import { render } from '@testing-library/react';
import { SkeletonCard } from '../SkeletonCard';

describe('SkeletonCard', () => {
  it('renders with animate-pulse class', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('merges custom className', () => {
    const { container } = render(<SkeletonCard className="h-28" />);
    expect(container.firstChild).toHaveClass('h-28');
  });
});
