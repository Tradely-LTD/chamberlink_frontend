import type { AnalyticsGeo, AnalyticsGeoBucket } from '@features/analytics/analyticsApi';
import type { ECertificate } from '@features/eco/ecoApi';

/**
 * A member's own footprint, computed from the applications they already have
 * on hand — no extra request, and it can never show another exporter's data.
 */
export function geoFromCertificates(certs: ECertificate[] | undefined): AnalyticsGeo | undefined {
  if (!certs) return undefined;
  const submitted = certs.filter((c) => c.status !== 'draft');
  const tally = (keyOf: (c: ECertificate) => string | null | undefined): AnalyticsGeoBucket[] => {
    const m = new Map<string, AnalyticsGeoBucket>();
    for (const c of submitted) {
      const key = keyOf(c);
      if (!key) continue;
      const row = m.get(key) ?? { key, applications: 0, issued: 0 };
      row.applications += 1;
      if (c.status === 'issued') row.issued += 1;
      m.set(key, row);
    }
    return [...m.values()].sort((a, b) => b.applications - a.applications);
  };
  return {
    destinations: tally((c) => c.destinationCountry),
    origins: tally((c) => c.originStates?.[0]),
    hsChapters: tally((c) => c.hsCode?.replace(/\D/g, '').slice(0, 2) || null),
  };
}
