import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from './chartPalette';

interface Props {
  totalMembers: number;
  activeMembers: number;
  pendingRenewals: number;
}

interface Segment {
  key: string;
  label: string;
  count: number;
  color: string;
}

function ChartTooltip({ active, payload, labelsByKey }: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  labelsByKey: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-card-hover space-y-1">
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm font-medium text-ink flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {labelsByKey[p.dataKey]}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function MembershipStatusBar({ totalMembers, activeMembers, pendingRenewals }: Props) {
  if (totalMembers === 0) {
    return <p className="text-sm text-ink-subtle">No members yet.</p>;
  }

  const segments: Segment[] = [
    { key: 'active', label: 'Active', count: activeMembers, color: CHART_COLORS.green },
    { key: 'pending', label: 'Pending Renewal', count: pendingRenewals, color: CHART_COLORS.gold },
    { key: 'inactive', label: 'Inactive / Expired', count: totalMembers - activeMembers - pendingRenewals, color: CHART_COLORS.neutral },
  ];

  // A single 100%-stacked horizontal bar: one row, one <Bar> per segment sharing a stackId.
  const row = { name: 'members', ...Object.fromEntries(segments.map((s) => [s.key, s.count])) };
  const labelsByKey = Object.fromEntries(segments.map((s) => [s.key, s.label]));

  return (
    <div>
      <ResponsiveContainer width="100%" height={40}>
        <BarChart data={[row]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap={0}>
          <XAxis type="number" hide domain={[0, totalMembers]} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip content={<ChartTooltip labelsByKey={labelsByKey} />} cursor={false} />
          {segments.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="status"
              fill={s.color}
              radius={i === 0 ? [4, 0, 0, 4] : i === segments.length - 1 ? [0, 4, 4, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-2">
        {segments.map((s) => {
          const pct = ((s.count / totalMembers) * 100).toFixed(1);
          return (
            <div key={s.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink">
                <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="text-ink-subtle">{s.count.toLocaleString()} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
