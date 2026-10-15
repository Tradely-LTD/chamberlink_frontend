import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Remove body padding, for a list or table that runs edge to edge. */
  flush?: boolean;
}

/** The standard settings-style section: title row, body, optional footer bar. */
export function SectionCard({ title, description, action, children, footer, className = '', flush }: Props) {
  return (
    <section className={`rounded-card border border-border bg-surface ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-ink-subtle">{description}</p>}
        </div>
        {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
      </header>
      <div className={flush ? '' : 'px-5 py-5'}>{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-card border-t border-border bg-surface-alt px-5 py-3">{footer}</div>}
    </section>
  );
}

/** Label/value pairs in a responsive two-column grid. */
export function DetailGrid({ items, cols = 2 }: { items: { label: string; value: ReactNode; wide?: boolean }[]; cols?: 1 | 2 }) {
  return (
    <dl className={`grid gap-x-8 gap-y-5 ${cols === 2 ? 'sm:grid-cols-2' : ''}`}>
      {items.map((it) => (
        <div key={it.label} className={`min-w-0 ${it.wide ? 'sm:col-span-2' : ''}`}>
          <dt className="text-xs text-ink-subtle">{it.label}</dt>
          <dd className="mt-1 break-words text-sm text-ink">{it.value === null || it.value === undefined || it.value === '' ? <span className="text-ink-subtle">Not set</span> : it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
