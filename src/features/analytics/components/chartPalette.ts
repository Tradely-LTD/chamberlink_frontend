// Chart-tuned tints derived from the brand hues (primary blue, gold) — NOT the
// raw UI-chrome hex (#023293/#795900), which read too dark/low-contrast as thin
// line/area marks on a white surface. Validated as a set via the dataviz skill's
// validator (node scripts/validate_palette.js "<hexes>" --mode light):
//   "#a6790a,#2f6fed,#0f9d58" — all hard gates pass in this order.
// This app has no dark mode, so only a light-surface set is needed.
export const CHART_COLORS = {
  blue: '#2f6fed', // primary metric — revenue, new members
  green: '#0f9d58', // positive/growth — eCO issued, active status
  gold: '#a6790a', // secondary accent — pending/warning status
  neutral: '#8a9099', // "no status" — always paired with a visible label, never relied on alone
} as const;

export const monthLabel = (ym: string): string => {
  const [year, month] = ym.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-NG', { month: 'short', year: '2-digit' });
};
