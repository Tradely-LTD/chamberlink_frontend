import type { ReactNode } from 'react';

/** The small uppercase label the dashboard map uses ("WHERE CERTIFICATES ARE GOING"). */
export function SectionLabel({ children, className = '', as: Tag = 'p' }: { children: ReactNode; className?: string; as?: 'p' | 'h2' | 'h3' }) {
  return <Tag className={`text-2xs font-semibold uppercase text-ink-subtle ${className}`}>{children}</Tag>;
}
