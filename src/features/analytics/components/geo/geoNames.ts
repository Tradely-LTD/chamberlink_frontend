// Bridges the portal's country names (shared/constants/countries.ts, which is
// what applicants pick and what the backend stores) to the Natural Earth names
// in world-atlas/countries-110m.json. Built by diffing the two lists.

/** Our name → the atlas's abbreviated name, where they differ. */
export const ATLAS_NAME: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'Central African Republic': 'Central African Rep.',
  'Congo (Republic of the)': 'Congo',
  'Congo (Democratic Republic of the)': 'Dem. Rep. Congo',
  'Dominican Republic': 'Dominican Rep.',
  'Equatorial Guinea': 'Eq. Guinea',
  Eswatini: 'eSwatini',
  'North Macedonia': 'Macedonia',
  'Solomon Islands': 'Solomon Is.',
  'South Sudan': 'S. Sudan',
  'United States': 'United States of America',
};

/**
 * Countries too small to have an outline at 1:110m. They still get a trade
 * route and a dot, so a shipment to Singapore or Malta is never invisible on
 * the map. [longitude, latitude] of the capital.
 */
export const SMALL_STATE_COORDS: Record<string, [number, number]> = {
  Andorra: [1.52, 42.51],
  'Antigua and Barbuda': [-61.85, 17.12],
  Bahrain: [50.59, 26.23],
  Barbados: [-59.62, 13.1],
  'Cabo Verde': [-23.51, 14.93],
  Comoros: [43.26, -11.7],
  Dominica: [-61.39, 15.3],
  Grenada: [-61.75, 12.06],
  Kiribati: [172.98, 1.45],
  Liechtenstein: [9.52, 47.14],
  Maldives: [73.51, 4.18],
  Malta: [14.51, 35.9],
  'Marshall Islands': [171.38, 7.09],
  Mauritius: [57.5, -20.16],
  Micronesia: [158.16, 6.92],
  Monaco: [7.42, 43.74],
  Nauru: [166.92, -0.55],
  Palau: [134.48, 7.5],
  'Saint Kitts and Nevis': [-62.72, 17.3],
  'Saint Lucia': [-60.98, 14.01],
  'Saint Vincent and the Grenadines': [-61.23, 13.16],
  Samoa: [-171.77, -13.83],
  'San Marino': [12.45, 43.94],
  'Sao Tome and Principe': [6.73, 0.34],
  Seychelles: [55.45, -4.62],
  Singapore: [103.82, 1.35],
  Tonga: [-175.2, -21.14],
  Tuvalu: [179.19, -8.52],
  'Vatican City': [12.45, 41.9],
};

/** 2-digit HS chapters NACCIMA certificates commonly carry. Anything else reads "Chapter NN". */
const HS_CHAPTERS: Record<string, string> = {
  '03': 'Fish & seafood',
  '08': 'Edible fruit & nuts',
  '09': 'Coffee, tea & spices',
  '12': 'Oil seeds',
  '15': 'Animal & vegetable fats',
  '18': 'Cocoa',
  '24': 'Tobacco',
  '25': 'Salt, sulphur, earths & stone',
  '26': 'Ores, slag & ash',
  '27': 'Mineral fuels & oils',
  '39': 'Plastics',
  '40': 'Rubber',
  '41': 'Raw hides & skins',
  '44': 'Wood',
  '52': 'Cotton',
  '71': 'Precious stones & metals',
  '72': 'Iron & steel',
  '74': 'Copper',
  '76': 'Aluminium',
  '78': 'Lead',
  '79': 'Zinc',
  '80': 'Tin',
  '81': 'Other base metals',
};

export const hsChapterLabel = (chapter: string) => HS_CHAPTERS[chapter] ?? `Chapter ${chapter}`;
