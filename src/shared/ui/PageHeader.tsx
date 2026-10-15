import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Crumb { label: string; to?: string }

interface Props {
  title: ReactNode;
  description?: ReactNode;
  /** Small uppercase context line above the title (e.g. "Workspace"). */
  eyebrow?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}

/** The one page title per screen — the top bar deliberately carries none. */
export function PageHeader({ title, description, eyebrow, breadcrumbs, actions, className = '' }: Props) {
  return (
    <header className={`mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-subtle">
            {breadcrumbs.map((c, i) => (
              <li key={c.label} className="flex items-center gap-1">
                {i > 0 && <span className="material-symbols-outlined text-border-input" aria-hidden="true" style={{ fontSize: 16 }}>chevron_right</span>}
                {c.to ? <Link to={c.to} className="hover:text-primary transition-colors">{c.label}</Link> : <span aria-current="page" className="text-ink-muted">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-2xs font-semibold uppercase text-ink-subtle mb-1">{eyebrow}</p>}
          <h1 className="text-[22px] sm:text-2xl font-semibold leading-tight text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-[14px] text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
