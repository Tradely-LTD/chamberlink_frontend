import { useEffect } from 'react';

interface Props {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const styles = {
  success: { icon: 'check_circle', color: 'text-success' },
  error: { icon: 'error', color: 'text-danger' },
  info: { icon: 'info', color: 'text-primary' },
};

export function Toast({ message, type, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const s = styles[type];
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-pop animate-fade-up"
    >
      <span className={`material-symbols-outlined ${s.color}`} aria-hidden="true" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1` }}>{s.icon}</span>
      <p className="text-sm text-ink pt-px">{message}</p>
      <button onClick={onClose} aria-label="Dismiss" className="ml-auto -mr-1 -mt-1 rounded-md p-1 text-ink-subtle hover:bg-surface-alt hover:text-ink transition-colors">
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>close</span>
      </button>
    </div>
  );
}
