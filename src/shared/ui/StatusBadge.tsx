import { statusLabel, statusTone } from './statusStyles';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'gold';

const tones: Record<StatusTone, { wrap: string; dot: string }> = {
  neutral: { wrap: 'bg-surface-alt text-ink-muted border-border', dot: 'bg-ink-subtle' },
  info:    { wrap: 'bg-primary-soft text-primary border-primary-200', dot: 'bg-primary' },
  success: { wrap: 'bg-success-bg text-success border-success-border', dot: 'bg-success' },
  warning: { wrap: 'bg-warning-bg text-warning border-warning-border', dot: 'bg-warning' },
  danger:  { wrap: 'bg-danger-bg text-danger border-danger-border', dot: 'bg-danger' },
  gold:    { wrap: 'bg-gold-soft text-gold border-gold-light/30', dot: 'bg-gold-light' },
};

/** A status is always a word plus a dot — never colour alone. */
export function StatusBadge({ tone = 'neutral', children, className = '' }: { tone?: StatusTone; children: React.ReactNode; className?: string }) {
  const t = tones[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${t.wrap} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export function Status({ status, label }: { status: string; label?: string }) {
  return <StatusBadge tone={statusTone(status)}>{label ?? statusLabel(status)}</StatusBadge>;
}
