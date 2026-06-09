import { render, screen } from '@testing-library/react';
import { ErrorBanner } from '../ErrorBanner';

describe('ErrorBanner', () => {
  it('renders the message', () => {
    render(<ErrorBanner message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('has error styling', () => {
    const { container } = render(<ErrorBanner message="Error" />);
    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveClass('bg-red-50');
    expect(banner).toHaveClass('text-red-700');
  });
});
