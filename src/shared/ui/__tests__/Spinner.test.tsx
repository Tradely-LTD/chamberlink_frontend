import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    render(<Spinner />);
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-6', 'w-6');
  });

  it('renders small size', () => {
    render(<Spinner size="sm" />);
    expect(screen.getByLabelText('Loading')).toHaveClass('h-4', 'w-4');
  });

  it('renders large size', () => {
    render(<Spinner size="lg" />);
    expect(screen.getByLabelText('Loading')).toHaveClass('h-8', 'w-8');
  });

  it('has animate-spin class', () => {
    render(<Spinner />);
    expect(screen.getByLabelText('Loading')).toHaveClass('animate-spin');
  });
});
