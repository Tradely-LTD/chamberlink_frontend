import { useState } from 'react';
import { useGetAnalyticsSummaryQuery, useGetAnalyticsTrendsQuery, useGetAnalyticsGeoQuery } from '@features/analytics/analyticsApi';
import { TrendBarChart } from '@features/analytics/components/TrendBarChart';
import { CHART_COLORS, monthLabel } from '@features/analytics/components/chartPalette';
import { ExportFootprint } from '@features/analytics/components/geo/ExportFootprint';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { PageHeader } from '@shared/ui/PageHeader';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { SegmentedTabs } from '@shared/ui/SegmentedTabs';

const naira = (n: number, full = false) => {
  if (full) return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n}`;
};
const count = (n: number) => n.toLocaleString('en-NG');
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** A tiny line for a KPI — shape only, no axes; the number beside it is the value. */
function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const w = 72, h = 24, max = Math.max(...values), min = Math.min(...values), r = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - ((v - min) / r) * (h - 2) - 1).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ now, before }: { now: number; before: number }) {
  if (before <= 0) return <span className="text-xs text-ink-subtle">No figure last month</span>;
  const d = ((now - before) / before) * 100;
  const up = d >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-success' : 'text-danger'}`}>
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 14 }}>{up ? 'arrow_upward' : 'arrow_downward'}</span>
      <span className="num">{Math.abs(d).toFixed(1)}%</span>
      <span className="font-normal text-ink-subtle">vs last month</span>
    </span>
  );
}

export function AnalyticsPage() {
  const [months, setMonths] = useState<'6' | '12'>('6');
  const { data, isLoading, isError, refetch } = useGetAnalyticsSummaryQuery();
  const { data: trends, isLoading: trendsLoading } = useGetAnalyticsTrendsQuery(Number(months));
  const { data: geo, isLoading: geoLoading, isError: geoError, refetch: refetchGeo } = useGetAnalyticsGeoQuery();
  // Zeros, never invented figures: on failure the error banner says so.
  const stats = data ?? { totalMembers: 0, activeMembers: 0, pendingRenewals: 0, ecoCertificatesIssued: 0, revenueThisMonth: 0, revenueLastMonth: 0, newMembersThisMonth: 0, tradeFairRegistrations: 0 };
  const t = trends ?? [];
  const other = Math.max(0, stats.totalMembers - stats.activeMembers - stats.pendingRenewals);

  const kpis = [
    { label: 'Revenue this month', value: naira(stats.revenueThisMonth), foot: <Delta now={stats.revenueThisMonth} before={stats.revenueLastMonth} />, spark: t.map((x) => x.revenue), color: CHART_COLORS.blue },
    { label: 'Certificates issued', value: count(stats.ecoCertificatesIssued), foot: <span className="text-xs text-ink-subtle">All time</span>, spark: t.map((x) => x.ecoIssued), color: CHART_COLORS.green },
    { label: 'Members', value: count(stats.totalMembers), foot: <span className="text-xs text-ink-subtle"><span className="num">{pct(stats.activeMembers, stats.totalMembers)}%</span> active</span>, spark: t.map((x) => x.newMembers), color: CHART_COLORS.gold },
    { label: 'New members this month', value: `+${count(stats.newMembersThisMonth)}`, foot: <span className="text-xs text-ink-subtle"><span className="num">{count(stats.pendingRenewals)}</span> renewals pending</span>, spark: [], color: CHART_COLORS.gold },
    { label: 'Trade fair bookings', value: count(stats.tradeFairRegistrations), foot: <span className="text-xs text-ink-subtle">Reserved or checked in</span>, spark: [], color: CHART_COLORS.blue },
  ];

  const panel = 'rounded-card border border-border bg-surface';

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Analytics"
        description="Revenue, certificates and membership over time, and where exports are going."
        actions={
          <SegmentedTabs label="Period" value={months} onChange={setMonths}
            tabs={[{ value: '6', label: 'Last 6 months' }, { value: '12', label: 'Last 12 months' }]} />
        }
      />
      {isError && <div className="mb-6"><ErrorBanner message="Couldn't load the analytics summary. The figures below are not current." onRetry={refetch} /></div>}

      {/* KPI strip */}
      {isLoading ? (
        <SkeletonCard className="mb-6 h-[124px]" />
      ) : (
        <section aria-label="Key figures" className={`${panel} mb-6 grid grid-cols-2 overflow-hidden md:grid-cols-3 xl:grid-cols-5`}>
          {kpis.map((k, i) => (
            <div key={k.label} className={`flex flex-col gap-2 p-5 ${i > 0 ? 'border-l border-border' : ''} max-xl:[&:nth-child(4)]:border-l-0 max-md:[&:nth-child(3)]:border-l-0 max-md:[&:nth-child(5)]:border-l-0 max-xl:border-t-0`}>
              <p className="text-2xs font-semibold uppercase text-ink-subtle">{k.label}</p>
              <div className="flex items-end justify-between gap-3">
                <p className="num text-[28px] font-semibold leading-none text-ink">{k.value}</p>
                <Spark values={k.spark} color={k.color} />
              </div>
              {k.foot}
            </div>
          ))}
        </section>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <section className={`${panel} p-5 lg:col-span-2`}>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Revenue</h2>
              <p className="text-[13px] text-ink-subtle">Confirmed payments per month, all services</p>
            </div>
            <p className="num text-[13px] text-ink-muted">{naira(t.reduce((s, x) => s + x.revenue, 0), true)} <span className="text-ink-subtle">in period</span></p>
          </div>
          {trendsLoading ? <SkeletonCard className="h-[240px]" /> : <TrendBarChart data={t} dataKey="revenue" color={CHART_COLORS.blue} format={naira} emptyText="No payments in this period yet." height={240} />}
        </section>

        <section className={`${panel} p-5`}>
          <h2 className="text-[15px] font-semibold text-ink">Membership health</h2>
          <p className="mb-5 text-[13px] text-ink-subtle">{count(stats.totalMembers)} members in total</p>
          {stats.totalMembers === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-subtle">No members yet.</p>
          ) : (
            <>
              <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img"
                aria-label={`${stats.activeMembers} active, ${stats.pendingRenewals} awaiting renewal, ${other} other`}>
                {[{ v: stats.activeMembers, c: 'bg-success' }, { v: stats.pendingRenewals, c: 'bg-gold-light' }, { v: other, c: 'bg-border-strong' }]
                  .filter((s) => s.v > 0)
                  .map((s, i) => <div key={i} className={s.c} style={{ width: `${(s.v / stats.totalMembers) * 100}%` }} />)}
              </div>
              <dl className="mt-5 space-y-3 text-[13px]">
                {[
                  { label: 'Active', v: stats.activeMembers, dot: 'bg-success' },
                  { label: 'Awaiting renewal payment', v: stats.pendingRenewals, dot: 'bg-gold-light' },
                  { label: 'Expired or suspended', v: other, dot: 'bg-border-strong' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-ink-muted"><span className={`h-2.5 w-2.5 rounded-sm ${r.dot}`} aria-hidden="true" />{r.label}</dt>
                    <dd className="num text-ink"><span className="font-semibold">{count(r.v)}</span> <span className="text-ink-subtle">· {pct(r.v, stats.totalMembers)}%</span></dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className={`${panel} p-5`}>
          <h2 className="text-[15px] font-semibold text-ink">Certificates issued</h2>
          <p className="mb-4 text-[13px] text-ink-subtle">Per month</p>
          {trendsLoading ? <SkeletonCard className="h-[200px]" /> : <TrendBarChart data={t} dataKey="ecoIssued" color={CHART_COLORS.green} format={(n) => count(n)} emptyText="No certificates issued in this period." height={200} />}
        </section>
        <section className={`${panel} p-5`}>
          <h2 className="text-[15px] font-semibold text-ink">New members</h2>
          <p className="mb-4 text-[13px] text-ink-subtle">Per month</p>
          {trendsLoading ? <SkeletonCard className="h-[200px]" /> : <TrendBarChart data={t} dataKey="newMembers" color={CHART_COLORS.gold} format={(n) => count(n)} emptyText="No new members in this period." height={200} />}
        </section>
      </div>

      {/* The exact numbers behind the three charts. */}
      {t.length > 0 && (
        <details className={`${panel} mb-6 group`}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[13px] font-medium text-ink hover:bg-surface-alt rounded-card">
            Monthly figures as a table
            <span className="material-symbols-outlined text-ink-subtle transition-transform group-open:rotate-180" aria-hidden="true" style={{ fontSize: 20 }}>expand_more</span>
          </summary>
          <div className="overflow-x-auto border-t border-border">
            <table className="data-table">
              <thead><tr><th>Month</th><th className="text-right">Revenue</th><th className="text-right">Certificates issued</th><th className="text-right">New members</th></tr></thead>
              <tbody>
                {[...t].reverse().map((x) => (
                  <tr key={x.month}>
                    <td className="whitespace-nowrap">{monthLabel(x.month)}</td>
                    <td className="num text-right">{naira(x.revenue, true)}</td>
                    <td className="num text-right">{count(x.ecoIssued)}</td>
                    <td className="num text-right">{count(x.newMembers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <ExportFootprint
        title="Export activity"
        subtitle="Submitted certificate applications by destination, state of origin and goods."
        geo={geo}
        isLoading={geoLoading}
        isError={geoError}
        onRetry={refetchGeo}
        empty={<p className="text-sm text-ink-muted text-center">No certificate applications yet.</p>}
      />
    </div>
  );
}
