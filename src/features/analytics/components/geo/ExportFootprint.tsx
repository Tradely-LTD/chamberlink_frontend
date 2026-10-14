import { lazy, Suspense, type ReactNode } from 'react';
import type { AnalyticsGeo } from '@features/analytics/analyticsApi';
import { NigeriaTileMap } from './NigeriaTileMap';
import { RankedList } from './RankedList';
import { hsChapterLabel } from './geoNames';
import { plural } from './geoScale';

const TradeAtlas = lazy(() => import('./TradeAtlas'));

interface Props {
  title: string;
  subtitle: string;
  geo: AnalyticsGeo | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Shown instead of the maps when there is no activity at all. */
  empty: ReactNode;
}

/**
 * "What's happening, and where": a world map of destinations with trade routes
 * out of Nigeria, a tile map of origin states, and the ranked numbers behind
 * both. Used by every dashboard — members see their own applications,
 * chamber staff their chamber's, the super admin the whole platform.
 */
export function ExportFootprint({ title, subtitle, geo, isLoading, isError, onRetry, empty }: Props) {
  const total = geo?.destinations.reduce((n, d) => n + d.applications, 0) ?? 0;

  return (
    <section className="bg-white rounded-xl border border-border overflow-hidden" aria-labelledby="footprint-title">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 id="footprint-title" className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-xs text-ink-subtle mt-0.5">{subtitle}</p>
        </div>
        {geo && total > 0 && (
          <p className="text-xs text-ink-muted tabular-nums">
            {plural(total, 'application')} · {plural(geo.destinations.length, 'country', 'countries')} · {plural(geo.origins.length, 'state')}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="p-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]" aria-busy="true">
          <div className="aspect-[2/1] rounded-lg bg-surface-alt animate-pulse" />
          <div className="aspect-[8/7] rounded-lg bg-surface-alt animate-pulse" />
        </div>
      ) : isError ? (
        <div className="p-5 flex items-center justify-between gap-4">
          <p className="text-sm text-danger">Couldn&apos;t load the export map.</p>
          {onRetry && <button onClick={onRetry} className="text-sm font-medium text-primary hover:underline">Retry</button>}
        </div>
      ) : !geo || total === 0 ? (
        <div className="p-8">{empty}</div>
      ) : (
        <div className="p-5 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle mb-2">Where certificates are going</p>
            <Suspense fallback={<div className="aspect-[2/1] rounded-lg bg-surface-alt animate-pulse" />}>
              <TradeAtlas destinations={geo.destinations} />
            </Suspense>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <RankedList title="Top destinations" rows={geo.destinations} />
              {geo.hsChapters.length > 0 && (
                <RankedList title="Goods by HS chapter" rows={geo.hsChapters} labelFor={(k) => `${k} · ${hsChapterLabel(k)}`} />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle mb-2">Where goods come from</p>
            <NigeriaTileMap origins={geo.origins} />
            <div className="mt-5">
              <RankedList title="Top origin states" rows={geo.origins} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
