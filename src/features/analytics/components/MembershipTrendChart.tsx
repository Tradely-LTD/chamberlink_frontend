import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AnalyticsTrendPoint } from '../analyticsApi';
import { CHART_COLORS, monthLabel } from './chartPalette';

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-card-hover">
      <p className="text-xs text-ink-subtle mb-1">{monthLabel(label ?? '')}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-medium text-ink flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

interface Props {
  data: AnalyticsTrendPoint[];
}

export function MembershipTrendChart({ data }: Props) {
  const hasData = data.some((d) => d.newMembers > 0 || d.ecoIssued > 0);

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-ink-subtle">
        Not enough history yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e5e9" />
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tick={{ fontSize: 11, fill: '#74777f' }}
          axisLine={{ stroke: '#e2e5e9' }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: '#74777f' }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#74777f', paddingTop: 8 }}
        />
        <Line type="monotone" dataKey="newMembers" name="New Members" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.blue }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="ecoIssued" name="eCO Issued" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.green }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
