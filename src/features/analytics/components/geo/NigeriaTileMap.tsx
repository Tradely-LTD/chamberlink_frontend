import { useState } from 'react';
import type { AnalyticsGeoBucket } from '@features/analytics/analyticsApi';
import { EMPTY_FILL, SEQUENTIAL_RAMP, TEXT_ON, legendStops, plural, stepFor } from './geoScale';

// Tile-grid cartogram of Nigeria's 36 states + FCT: every state the same size,
// placed roughly where it sits on the real map. Chosen over true outlines on
// purpose — Lagos and FCT are specks on a real map but carry a large share of
// exports, and equal tiles let every state hold a readable code and count.
// [column, row, ISO 3166-2:NG code]
const TILES: Record<string, [number, number, string]> = {
  Sokoto: [1, 0, 'SO'], Zamfara: [2, 0, 'ZA'], Katsina: [3, 0, 'KT'], Kano: [4, 0, 'KN'], Jigawa: [5, 0, 'JI'], Yobe: [6, 0, 'YO'], Borno: [7, 0, 'BO'],
  Kebbi: [1, 1, 'KE'], Niger: [2, 1, 'NI'], Kaduna: [3, 1, 'KD'], Bauchi: [4, 1, 'BA'], Gombe: [5, 1, 'GO'], Adamawa: [6, 1, 'AD'],
  Oyo: [0, 2, 'OY'], Kwara: [1, 2, 'KW'], 'Federal Capital Territory': [2, 2, 'FC'], Nasarawa: [3, 2, 'NA'], Plateau: [4, 2, 'PL'], Taraba: [5, 2, 'TA'],
  Ogun: [0, 3, 'OG'], Osun: [1, 3, 'OS'], Ekiti: [2, 3, 'EK'], Kogi: [3, 3, 'KO'], Benue: [4, 3, 'BE'],
  Lagos: [0, 4, 'LA'], Ondo: [1, 4, 'ON'], Edo: [2, 4, 'ED'], Enugu: [3, 4, 'EN'], Ebonyi: [4, 4, 'EB'], 'Cross River': [5, 4, 'CR'],
  Delta: [1, 5, 'DE'], Anambra: [2, 5, 'AN'], Imo: [3, 5, 'IM'], Abia: [4, 5, 'AB'], 'Akwa Ibom': [5, 5, 'AK'],
  Bayelsa: [1, 6, 'BY'], Rivers: [2, 6, 'RI'],
};
const COLS = 8;
const ROWS = 7;

interface Props {
  origins: AnalyticsGeoBucket[];
}

export function NigeriaTileMap({ origins }: Props) {
  const byState = new Map(origins.map((o) => [o.key, o]));
  const max = Math.max(0, ...origins.map((o) => o.applications));
  const [active, setActive] = useState<string | null>(null);
  const activeRow = active ? byState.get(active) : undefined;

  return (
    <div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${ROWS}, auto)` }}
        role="group"
        aria-label="Applications by state of origin"
        onMouseLeave={() => setActive(null)}
      >
        {Object.entries(TILES).map(([state, [col, row, code]]) => {
          const data = byState.get(state);
          const step = stepFor(data?.applications ?? 0, max);
          const isActive = active === state;
          return (
            <div
              key={state}
              tabIndex={0}
              aria-label={`${state}: ${plural(data?.applications ?? 0, 'application')}, ${data?.issued ?? 0} issued`}
              onMouseEnter={() => setActive(state)}
              onFocus={() => setActive(state)}
              onBlur={() => setActive(null)}
              className={`aspect-square rounded-md flex flex-col items-center justify-center leading-none cursor-default select-none outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                step < 0 ? 'border border-border' : ''
              } ${isActive ? 'ring-2 ring-ink ring-offset-1' : ''}`}
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
                background: step < 0 ? EMPTY_FILL : SEQUENTIAL_RAMP[step],
                color: step < 0 ? '#74777f' : TEXT_ON[step],
              }}
            >
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide">{code}</span>
              {data && <span className="text-[10px] sm:text-xs font-bold tabular-nums mt-0.5">{data.applications}</span>}
            </div>
          );
        })}
      </div>

      {/* Live readout instead of a floating tooltip: reachable by keyboard, never clipped by the card edge. */}
      <p className="mt-3 h-5 text-xs text-ink-muted tabular-nums" aria-live="polite">
        {active
          ? <><span className="font-semibold text-ink">{active}</span>: {plural(activeRow?.applications ?? 0, 'application')}, {activeRow?.issued ?? 0} issued</>
          : 'Hover or tab through a state to see its numbers.'}
      </p>

      <SequentialLegend max={max} />
    </div>
  );
}

export function SequentialLegend({ max }: { max: number }) {
  const stops = legendStops(max);
  if (!stops.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
      <span className="font-medium">Applications</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border border-border" style={{ background: EMPTY_FILL }} />
        None
      </span>
      {stops.map((s) => (
        <span key={s.step} className="inline-flex items-center gap-1.5 tabular-nums">
          <span className="h-3 w-3 rounded-sm" style={{ background: SEQUENTIAL_RAMP[s.step] }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
