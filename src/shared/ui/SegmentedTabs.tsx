interface Tab<T extends string> { value: T; label: string; count?: number }

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Filter/segment switcher. Scrolls horizontally on small screens instead of wrapping. */
export function SegmentedTabs<T extends string>({ tabs, value, onChange, label, className = '' }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className={`inline-flex max-w-full gap-0.5 overflow-x-auto rounded-control border border-border bg-surface-alt p-0.5 ${className}`}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 text-[13px] font-medium transition-colors focus-visible:shadow-focus ${
              active ? 'bg-surface text-ink shadow-card' : 'text-ink-subtle hover:text-ink'
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
