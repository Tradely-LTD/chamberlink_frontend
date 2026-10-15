import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { AnalyticsTrendPoint } from '../analyticsApi';
import { monthLabel } from './chartPalette';

type Key = 'revenue' | 'newMembers' | 'ecoIssued';

interface Props {
  data: AnalyticsTrendPoint[];
  dataKey: Key;
  color: string;
  /** Formats a value for the axis (compact) and the tooltip (full). */
  format: (n: number, full?: boolean) => string;
  emptyText: string;
  height?: number;
}

function TipBox({ active, payload, label, format }: { active?: boolean; payload?: { value: number }[]; label?: string; format: Props['format'] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-control border border-border bg-surface px-3 py-2 shadow-pop">
      <p className="text-xs text-ink-subtle">{monthLabel(label ?? '')}</p>
      <p className="num text-sm font-semibold text-ink">{format(payload[0].value, true)}</p>
    </div>
  );
}

/**
 * One measure per chart, one hue, thin bars with rounded tops anchored to the
 * baseline, recessive grid. The current month is drawn at full strength and
 * earlier months slightly lighter, so "now" reads first.
 */
export function TrendBarChart({ data, dataKey, color, format, emptyText, height = 220 }: Props) {
  if (!data.some((d) => d[dataKey] > 0)) {
    return <div className="flex items-center justify-center text-[13px] text-ink-subtle" style={{ height }}>{emptyText}</div>;
  }
  const last = data.length - 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="rgb(var(--c-border-subtle))" />
        <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11, fill: 'rgb(var(--c-ink-subtle))' }} axisLine={{ stroke: 'rgb(var(--c-border))' }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={(v: number) => format(v)} tick={{ fontSize: 11, fill: 'rgb(var(--c-ink-subtle))' }} axisLine={false} tickLine={false} width={52} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgb(var(--c-surface-alt))' }} content={<TipBox format={format} />} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={i === last ? 1 : 0.55} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
