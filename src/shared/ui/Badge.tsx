import type { ReactNode } from 'react';
import { StatusBadge, type StatusTone } from './StatusBadge';

interface Props {
  label?: string;
  children?: ReactNode;
  variant?: 'default' | 'coming-soon' | 'success' | 'warning' | 'error';
}

const toneFor: Record<NonNullable<Props['variant']>, StatusTone> = {
  default: 'info',
  'coming-soon': 'gold',
  success: 'success',
  warning: 'warning',
  error: 'danger',
};

export function Badge({ label, children, variant = 'default' }: Props) {
  return <StatusBadge tone={toneFor[variant]}>{children ?? label}</StatusBadge>;
}
