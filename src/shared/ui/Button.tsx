import { Spinner } from './Spinner';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  /**
   * primary — the one main action on a screen.
   * secondary / outline — neutral bordered button for everything else.
   * ghost — low-emphasis, text-like.
   * danger — destructive, visually separated from primary.
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md';
}

const variants: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-primary text-white shadow-card hover:bg-primary-hover',
  secondary: 'bg-surface text-ink border border-border-strong shadow-card hover:bg-surface-alt hover:border-border-input',
  outline: 'bg-surface text-ink border border-border-strong shadow-card hover:bg-surface-alt hover:border-border-input',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
  danger: 'bg-surface text-danger border border-danger-border hover:bg-danger-bg',
};

const sizes = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export function Button({
  children,
  loading,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-control font-medium transition-[background-color,border-color,box-shadow,color] duration-150 focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
