import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AnalyticsTrendPoint } from '../analyticsApi';
import { CHART_COLORS, monthLabel } from './chartPalette';

const fmtNaira = (n: number) => `₦${(n / 1000).toFixed(0)}k`;

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-card-hover">
      <p className="text-xs text-ink-subtle mb-0.5">{monthLabel(label ?? '')}</p>
      <p className="text-sm font-semibold text-ink">₦{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

interface Props {
  data: AnalyticsTrendPoint[];
}

export function RevenueTrendChart({ data }: Props) {
  const hasData = data.some((d) => d.revenue > 0);

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-ink-subtle">
        Not enough revenue history yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e2e5e9" />
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tick={{ fontSize: 11, fill: '#74777f' }}
          axisLine={{ stroke: '#e2e5e9' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtNaira}
          tick={{ fontSize: 11, fill: '#74777f' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={CHART_COLORS.blue}
          strokeWidth={2}
          fill="url(#revenueFill)"
          dot={{ r: 3, strokeWidth: 0, fill: CHART_COLORS.blue }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
