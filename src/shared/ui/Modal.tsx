import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/** Centred dialog with a scrim; Escape and the scrim both close it. */
export function Modal({ title, onClose, children, footer, size = 'sm' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} rounded-card border border-border bg-surface shadow-pop animate-fade-up`}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-control text-ink-subtle transition-colors hover:bg-surface-alt hover:text-ink">
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border bg-surface-alt px-5 py-3 rounded-b-card">{footer}</div>}
      </div>
    </div>
  );
}
