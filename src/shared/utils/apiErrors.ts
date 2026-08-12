/**
 * Shared helpers for interpreting RTK Query error shapes across features.
 */

interface RtkQueryErrorLike {
  status?: number | string;
  data?: { message?: string };
}

/**
 * True when a membership-detail endpoint (GET/PUT/PATCH /membership/me, dues,
 * documents, trade-fair booth reservation, export-documents, exporter-visibility,
 * etc.) 404s because the caller has zero chamber connections or none currently
 * active. This is NOT a generic error — screens must route to a "connect to a
 * chamber" empty-state/CTA instead of an error toast/banner.
 */
export function isNoActiveChamberError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as RtkQueryErrorLike;
  return e.status === 404 && e.data?.message === 'No active chamber connection';
}
