interface StatTileProps {
  icon?: string;
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
  /** Compact glanceable trend — not a full chart, no tooltip. Needs >= 2 points to render. */
  sparkline?: number[];
}

function Sparkline({ data }: { data: number[] }) {
  const w = 64;
  const h = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="rgb(var(--c-primary))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  );
}

// `accent` is accepted for call-site compatibility and deliberately has no
// visual effect: every tile reads the same.
export function StatTile({ icon, label, value, sublabel, accent: _accent, sparkline }: StatTileProps) {
  return (
    <div className={`relative overflow-hidden rounded-card border border-border bg-surface p-5 `}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            {icon && <span className="material-symbols-outlined text-ink-subtle" style={{ fontSize: 16 }} aria-hidden="true">{icon}</span>}
            <p className="text-2xs font-semibold uppercase text-ink-subtle">{label}</p>
          </div>
          <p className="num text-[26px] font-semibold leading-none text-ink">{value}</p>
          {sublabel && <p className="text-xs mt-2 text-ink-subtle">{sublabel}</p>}
        </div>
        {sparkline && sparkline.length >= 2 && <Sparkline data={sparkline} />}
      </div>
    </div>
  );
}
