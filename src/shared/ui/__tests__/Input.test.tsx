import { render, screen } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  it('renders label and input', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(<Input label="Email" error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('applies error border class when error is provided', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
  });

  it('applies normal border class when no error', () => {
    render(<Input label="Email" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-[#bec9bf]');
  });

  it('passes through additional props', () => {
    render(<Input label="Email" type="email" placeholder="you@example.com" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'you@example.com');
  });
});
