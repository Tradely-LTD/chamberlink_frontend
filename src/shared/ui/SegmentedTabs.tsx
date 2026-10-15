interface Tab<T extends string> { value: T; label: string; count?: number }

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Underline tabs: a quiet bar with a blue indicator under the active tab. Scrolls sideways on small screens. */
export function SegmentedTabs<T extends string>({ tabs, value, onChange, label, className = '' }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className={`flex items-end gap-6 overflow-x-auto border-b border-border ${className}`}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-1 pb-2.5 pt-1 text-sm font-medium transition-colors focus-visible:shadow-focus ${
              active ? 'border-primary text-ink' : 'border-transparent text-ink-subtle hover:border-border-strong hover:text-ink'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className={`num rounded-full px-1.5 text-2xs ${active ? 'bg-primary-soft text-primary' : 'bg-border-subtle text-ink-subtle'}`}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
