import type { ReactNode } from 'react';

interface Props {
  label?: string;
  children?: ReactNode;
  variant?: 'default' | 'coming-soon' | 'success' | 'warning' | 'error';
}

const styles: Record<NonNullable<Props['variant']>, string> = {
  default: 'bg-primary/10 text-primary',
  'coming-soon': 'bg-warning-bg text-warning-text',
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  error: 'bg-danger-bg text-danger-text',
};

export function Badge({ label, children, variant = 'default' }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children ?? label}
    </span>
  );
}
