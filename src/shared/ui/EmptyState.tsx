import type { ReactNode } from 'react';

interface Props {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}

/**
 * Generic "nothing here yet" state — visually distinct from ErrorBanner on
 * purpose. Use this whenever an absence of data is an expected, normal state
 * (e.g. zero chamber connections) rather than a failure.
 */
export function EmptyState({ icon = 'inbox', title, message, action }: Props) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-muted">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
