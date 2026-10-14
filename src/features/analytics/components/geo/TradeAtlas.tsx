import { useMemo, useRef, useState } from 'react';
import { geoCentroid, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import type { AnalyticsGeoBucket } from '@features/analytics/analyticsApi';
import { ATLAS_NAME, SMALL_STATE_COORDS } from './geoNames';
import { EMPTY_FILL, ROUTE_COLOR, SEQUENTIAL_RAMP, plural, stepFor } from './geoScale';
import { SequentialLegend } from './NigeriaTileMap';

// Lazy-loaded (see ExportFootprint): this module pulls in ~100 KB of world
// outlines, which only people who open a dashboard should pay for.

const W = 960;
const H = 470;
const MAX_ROUTES = 15;

type CountryFeature = Feature<Geometry, { name: string }>;

const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = (feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>)
  .features.filter((f) => f.properties.name !== 'Antarctica') as CountryFeature[];

const projection = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'FeatureCollection', features: countries });
const path = geoPath(projection);
const nigeria = countries.find((f) => f.properties.name === 'Nigeria');
const origin = nigeria ? projection(geoCentroid(nigeria)) : null;

interface Tip { name: string; row?: AnalyticsGeoBucket; x: number; y: number }

interface Props {
  destinations: AnalyticsGeoBucket[];
}

export default function TradeAtlas({ destinations }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const max = Math.max(0, ...destinations.map((d) => d.applications));

  // Keyed by ATLAS name so a path lookup is a single map hit.
  const byAtlasName = useMemo(
    () => new Map(destinations.map((d) => [ATLAS_NAME[d.key] ?? d.key, d])),
    [destinations]
  );

  const routes = useMemo(() => {
    if (!origin) return [];
    return destinations
      .filter((d) => d.key !== 'Nigeria')
      .slice(0, MAX_ROUTES)
      .flatMap((d) => {
        const atlasName = ATLAS_NAME[d.key] ?? d.key;
        const shape = countries.find((f) => f.properties.name === atlasName);
        const lonLat = shape ? geoCentroid(shape) : SMALL_STATE_COORDS[d.key];
        const end = lonLat ? projection(lonLat as [number, number]) : null;
        if (!end) return [];
        const [x1, y1] = origin;
        const [x2, y2] = end;
        // Lift the control point perpendicular to the chord so routes arc
        // rather than overlap as straight lines out of the same origin.
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const lift = Math.min(120, len * 0.3);
        const cx = (x1 + x2) / 2 + (dy / len) * lift * (dx > 0 ? -1 : 1);
        const cy = (y1 + y2) / 2 - Math.abs(dx / len) * lift;
        return [{ d, end, isSmall: !shape, curve: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`, len }];
      });
  }, [destinations]);

  const showTip = (name: string, row: AnalyticsGeoBucket | undefined, clientX: number, clientY: number) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ name, row, x: clientX - box.left, y: clientY - box.top });
  };

  const showTipAtShape = (f: CountryFeature, label: string, row?: AnalyticsGeoBucket) => {
    const p = projection(geoCentroid(f));
    const box = wrapRef.current?.getBoundingClientRect();
    if (!p || !box) return;
    const scale = box.width / W;
    setTip({ name: label, row, x: p[0] * scale, y: p[1] * scale });
  };

  const maxApps = Math.max(1, ...routes.map((r) => r.d.applications));

  return (
    <div>
      <div ref={wrapRef} className="relative" onMouseLeave={() => setTip(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={`World map of certificate destinations; ${destinations.length} countries`}>
          <g>
            {countries.map((f) => {
              const name = f.properties.name;
              const row = byAtlasName.get(name);
              const step = stepFor(row?.applications ?? 0, max);
              const isOrigin = name === 'Nigeria';
              const label = Object.entries(ATLAS_NAME).find(([, v]) => v === name)?.[0] ?? name;
              return (
                <path
                  key={name}
                  d={path(f) ?? undefined}
                  fill={isOrigin ? '#fff3d6' : step < 0 ? EMPTY_FILL : SEQUENTIAL_RAMP[step]}
                  stroke={isOrigin ? ROUTE_COLOR : '#ffffff'}
                  strokeWidth={isOrigin ? 1.5 : 0.6}
                  tabIndex={row ? 0 : undefined}
                  aria-label={row ? `${label}: ${plural(row.applications, 'application')}, ${row.issued} issued` : undefined}
                  className={row ? 'cursor-pointer outline-none focus-visible:stroke-ink' : ''}
                  onMouseMove={(e) => showTip(isOrigin ? 'Nigeria — origin' : label, row, e.clientX, e.clientY)}
                  onFocus={() => showTipAtShape(f, label, row)}
                  onBlur={() => setTip(null)}
                />
              );
            })}
          </g>

          {/* Trade routes. Width encodes volume within 1–3px (thin marks); the
              draw-in animation is motion-safe only, and the routes are fully
              legible without it. */}
          <g fill="none" stroke={ROUTE_COLOR} strokeLinecap="round" pointerEvents="none">
            {routes.map((r, i) => (
              <path
                key={r.d.key}
                d={r.curve}
                strokeWidth={1 + (r.d.applications / maxApps) * 2}
                strokeOpacity={0.85}
                className="motion-safe:animate-route-draw"
                style={{ strokeDasharray: 2000, strokeDashoffset: 0, animationDelay: `${i * 60}ms` }}
              />
            ))}
            {routes.map((r) => (
              <circle key={`${r.d.key}-end`} cx={r.end[0]} cy={r.end[1]} r={r.isSmall ? 4 : 3} fill={r.isSmall ? SEQUENTIAL_RAMP[Math.max(0, stepFor(r.d.applications, max))] : ROUTE_COLOR} stroke="#ffffff" strokeWidth={2} />
            ))}
          </g>

          {origin && (
            <g pointerEvents="none">
              <circle cx={origin[0]} cy={origin[1]} r={10} fill={ROUTE_COLOR} fillOpacity={0.18} />
              <circle cx={origin[0]} cy={origin[1]} r={5} fill={ROUTE_COLOR} stroke="#ffffff" strokeWidth={2} />
            </g>
          )}
        </svg>

        {tip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 rounded-lg border border-border bg-white px-3 py-2 shadow-card-hover text-xs whitespace-nowrap"
            style={{ left: tip.x, top: tip.y, transform: `translate(${tip.x > (wrapRef.current?.clientWidth ?? 0) * 0.7 ? 'calc(-100% - 12px)' : '12px'}, -50%)` }}
          >
            <p className="font-semibold text-ink">{tip.name}</p>
            {tip.row ? (
              <p className="text-ink-muted tabular-nums mt-0.5">
                {plural(tip.row.applications, 'application')} · {tip.row.issued} issued
              </p>
            ) : (
              !tip.name.endsWith('origin') && <p className="text-ink-muted mt-0.5">No certificates yet</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SequentialLegend max={max} />
        <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
          <svg width="22" height="8" aria-hidden="true"><path d="M1 7 Q11 -1 21 7" fill="none" stroke={ROUTE_COLOR} strokeWidth="2" strokeLinecap="round" /></svg>
          Route from Nigeria (top {MAX_ROUTES})
        </span>
      </div>
    </div>
  );
}
