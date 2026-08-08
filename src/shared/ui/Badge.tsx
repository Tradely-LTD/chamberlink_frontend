import type { ReactNode } from 'react';

interface Props {
  label?: string;
  children?: ReactNode;
  variant?: 'default' | 'coming-soon' | 'success' | 'warning' | 'error';
}

const styles: Record<NonNullable<Props['variant']>, string> = {
  default: 'bg-[#00502e]/10 text-[#00502e]',
  'coming-soon': 'bg-amber-100 text-amber-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-700',
};

export function Badge({ label, children, variant = 'default' }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children ?? label}
    </span>
  );
}
