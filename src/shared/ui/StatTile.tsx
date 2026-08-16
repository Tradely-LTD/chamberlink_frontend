interface StatTileProps {
  icon?: string;
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
  /** Compact glanceable trend — not a full chart, no tooltip. Needs >= 2 points to render. */
  sparkline?: number[];
}

function Sparkline({ data, accent }: { data: number[]; accent?: boolean }) {
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
        stroke={accent ? '#ffffff' : '#023293'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={accent ? 0.85 : 0.65}
      />
    </svg>
  );
}

export function StatTile({ icon, label, value, sublabel, accent, sparkline }: StatTileProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent ? 'bg-primary border-primary text-white shadow-card' : 'bg-surface border-border shadow-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {icon && (
              <span
                className={`material-symbols-outlined ${accent ? 'text-white/70' : 'text-ink-subtle'}`}
                style={{ fontSize: 16 }}
                aria-hidden="true"
              >
                {icon}
              </span>
            )}
            <p className={`text-sm ${accent ? 'text-white/70' : 'text-ink-subtle'}`}>{label}</p>
          </div>
          <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-ink'}`}>{value}</p>
          {sublabel && <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-ink-subtle'}`}>{sublabel}</p>}
        </div>
        {sparkline && sparkline.length >= 2 && <Sparkline data={sparkline} accent={accent} />}
      </div>
    </div>
  );
}
