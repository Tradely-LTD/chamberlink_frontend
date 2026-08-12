import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="You're not connected to a chamber yet" />);
    expect(screen.getByText("You're not connected to a chamber yet")).toBeInTheDocument();
  });

  it('renders an optional message', () => {
    render(<EmptyState title="Nothing here" message="Connect to a chamber to get started." />);
    expect(screen.getByText('Connect to a chamber to get started.')).toBeInTheDocument();
  });

  it('omits the message paragraph when none is given', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByText('Connect to a chamber to get started.')).not.toBeInTheDocument();
  });

  it('renders the action slot when provided', () => {
    render(<EmptyState title="Nothing here" action={<button>Connect a chamber</button>} />);
    expect(screen.getByRole('button', { name: 'Connect a chamber' })).toBeInTheDocument();
  });

  it('is visually distinct from an error state (dashed border, not red)', () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('border-dashed');
    expect(root.className).not.toContain('red');
  });
});
