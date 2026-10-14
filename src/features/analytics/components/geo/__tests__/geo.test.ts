import { describe, it, expect } from 'vitest';
import { NIGERIAN_LGAS } from '@shared/constants/nigerianLgas';
import { NIGERIAN_STATES } from '@shared/constants/nigerianStates';
import { COUNTRIES } from '@shared/constants/countries';
import { stepFor, legendStops } from '../geoScale';
import { ATLAS_NAME, SMALL_STATE_COORDS } from '../geoNames';
import { geoFromCertificates } from '../geoFromCertificates';
import world from 'world-atlas/countries-110m.json';
import type { ECertificate } from '@features/eco/ecoApi';

describe('Nigerian LGA list', () => {
  it('covers exactly the 36 states + FCT, keyed by the same names the state picker uses', () => {
    expect(Object.keys(NIGERIAN_LGAS).sort()).toEqual([...NIGERIAN_STATES].sort());
  });

  it('has the official 774 LGAs with no duplicates inside a state', () => {
    const all = Object.values(NIGERIAN_LGAS);
    expect(all.reduce((n, l) => n + l.length, 0)).toBe(774);
    for (const lgas of all) expect(new Set(lgas).size).toBe(lgas.length);
  });
});

describe('world map name bridge', () => {
  it('can place every destination an applicant can pick — as an outline or a small-state dot', () => {
    const atlasNames = new Set(
      (world as unknown as { objects: { countries: { geometries: { properties: { name: string } }[] } } })
        .objects.countries.geometries.map((g) => g.properties.name)
    );
    const unplaceable = COUNTRIES.filter((c) => !atlasNames.has(ATLAS_NAME[c] ?? c) && !SMALL_STATE_COORDS[c]);
    expect(unplaceable).toEqual([]);
  });
});

describe('sequential bucketing', () => {
  it('maps zero to "no data", the maximum to the darkest step', () => {
    expect(stepFor(0, 10)).toBe(-1);
    expect(stepFor(10, 10)).toBe(4);
    expect(stepFor(1, 10)).toBe(0);
  });

  it('collapses legend stops when the maximum is small instead of showing empty ranges', () => {
    expect(legendStops(2)).toEqual([{ step: 2, label: '1' }, { step: 4, label: '2' }]);
    expect(legendStops(0)).toEqual([]);
  });
});

describe('geoFromCertificates', () => {
  const cert = (over: Partial<ECertificate>) => ({ status: 'submitted', destinationCountry: 'Ghana', originStates: ['Kogi'], hsCode: '2601.11', ...over }) as ECertificate;

  it('ignores drafts, counts issued separately, and ranks busiest first', () => {
    const geo = geoFromCertificates([
      cert({ status: 'draft', destinationCountry: 'China' }),
      cert({ status: 'issued' }),
      cert({}),
      cert({ destinationCountry: 'China', originStates: ['Lagos'], hsCode: null }),
    ])!;
    expect(geo.destinations).toEqual([
      { key: 'Ghana', applications: 2, issued: 1 },
      { key: 'China', applications: 1, issued: 0 },
    ]);
    expect(geo.origins[0]).toEqual({ key: 'Kogi', applications: 2, issued: 1 });
    expect(geo.hsChapters).toEqual([{ key: '26', applications: 2, issued: 1 }]);
  });
});
