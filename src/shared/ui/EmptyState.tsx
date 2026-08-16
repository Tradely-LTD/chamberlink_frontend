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
    <div className="rounded-xl border border-dashed border-border/60 bg-[#f7f9f7] p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#d6e3ff]">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: 24, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
        >
          {icon}
        </span>
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-subtle">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
