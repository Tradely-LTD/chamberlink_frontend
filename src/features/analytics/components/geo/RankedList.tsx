import type { AnalyticsGeoBucket } from '@features/analytics/analyticsApi';
import { CHART_COLORS } from '@features/analytics/components/chartPalette';
import { EMPTY_FILL } from './geoScale';

interface Props {
  title: string;
  rows: AnalyticsGeoBucket[];
  /** Turns a raw key (e.g. HS chapter "26") into what a person reads. */
  labelFor?: (key: string) => string;
  limit?: number;
}

/**
 * The exact numbers behind a map — its table view. Bars are one hue (a single
 * measure), thin, and the value is always printed, so nothing is read from
 * length or colour alone.
 */
export function RankedList({ title, rows, labelFor = (k) => k, limit = 6 }: Props) {
  const top = rows.slice(0, limit);
  const max = Math.max(1, ...top.map((r) => r.applications));
  const rest = rows.length - top.length;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle mb-2">{title}</p>
      {top.length === 0 ? (
        <p className="text-xs text-ink-subtle">Nothing yet.</p>
      ) : (
        <table className="w-full table-fixed text-xs">
          <thead className="sr-only">
            <tr><th>{title}</th><th>Applications</th><th>Issued</th></tr>
          </thead>
          <tbody>
            {top.map((r) => (
              <tr key={r.key} className="align-middle">
                <td className="py-1.5 pr-3 w-[42%]">
                  <span className="block truncate text-ink" title={labelFor(r.key)}>{labelFor(r.key)}</span>
                </td>
                <td className="py-1.5 pr-3">
                  <span className="block h-1.5 rounded-full" style={{ background: EMPTY_FILL }} aria-hidden="true">
                    <span
                      className="block h-1.5 rounded-full"
                      style={{ width: `${Math.max(4, (r.applications / max) * 100)}%`, background: CHART_COLORS.blue }}
                    />
                  </span>
                </td>
                <td className="py-1.5 w-[7.5rem] text-right whitespace-nowrap tabular-nums">
                  <span className="font-semibold text-ink">{r.applications}</span>
                  <span className="text-ink-subtle"> · {r.issued} issued</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rest > 0 && <p className="mt-1 text-[11px] text-ink-subtle">+{rest} more</p>}
    </div>
  );
}
