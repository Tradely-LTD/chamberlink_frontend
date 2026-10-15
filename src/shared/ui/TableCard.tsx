import type { ReactNode } from 'react';

interface Props {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** The <table className="data-table"> (or empty/loading state). */
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** A titled card that holds a data table and scrolls it horizontally on narrow screens. */
export function TableCard({ title, description, actions, children, footer, className = '' }: Props) {
  return (
    <section className={`bg-surface rounded-card border border-border overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {description && <p className="text-[13px] text-ink-subtle mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
      {footer && <div className="px-5 py-3 border-t border-border bg-surface-alt text-[13px] text-ink-subtle">{footer}</div>}
    </section>
  );
}
