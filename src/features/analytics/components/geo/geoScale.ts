// Sequential (magnitude) ramp for every map in the portal — one hue, light to
// dark, ending on the same blue as CHART_COLORS.blue so maps and charts read as
// one system. Checked per the dataviz skill's rule for sequential ramps
// (monotonic lightness, not the categorical CVD check): relative luminance
// .765 → .494 → .280 → .181 → .065.
//
// Label contrast decides TEXT_ON: ink (#191c1e) is ≥5.4:1 on steps 0–2, white
// is ≥4.5:1 on steps 3–4. Never colour a label with the ramp itself.
export const SEQUENTIAL_RAMP = ['#d6e3ff', '#9dbbf6', '#5f8fea', '#2f6fed', '#0b3fa8'] as const;
export const TEXT_ON = ['#191c1e', '#191c1e', '#191c1e', '#ffffff', '#ffffff'] as const;

/** Fill for a place with no activity — recessive, distinguishable from step 0 by its border. */
export const EMPTY_FILL = '#eef1f5';

/** Origin marker / trade-route colour: the chart-tuned brand gold (3.9:1 on white). */
export const ROUTE_COLOR = '#a6790a';

/** Which ramp step a value falls in, 0–4. Linear against the busiest place so the darkest step always means "the most". */
export function stepFor(value: number, max: number): number {
  if (value <= 0 || max <= 0) return -1;
  return Math.min(SEQUENTIAL_RAMP.length - 1, Math.ceil((value / max) * SEQUENTIAL_RAMP.length) - 1);
}

/** The upper bound of each step, for the legend ("1–2", "3–4", …). Collapses duplicate bounds on small maxima. */
export function legendStops(max: number): { step: number; label: string }[] {
  if (max <= 0) return [];
  const stops: { step: number; label: string }[] = [];
  let lower = 1;
  for (let i = 0; i < SEQUENTIAL_RAMP.length; i++) {
    const upper = Math.floor(((i + 1) / SEQUENTIAL_RAMP.length) * max);
    if (upper < lower) continue;
    stops.push({ step: i, label: upper === lower ? `${upper}` : `${lower}–${upper}` });
    lower = upper + 1;
  }
  return stops;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
