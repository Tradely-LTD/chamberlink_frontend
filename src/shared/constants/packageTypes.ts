// Common package/unit types for the eCO "Number and Kind of Packages" field
// (e.g. "500 Bags") — the count and the type are captured as separate inputs
// in the UI and combined into one string for the backend/PDF, which still
// expects a single free-text field. 'Other' reveals a free-text input so
// this list never blocks an unusual packaging type.
export const PACKAGE_TYPES: string[] = [
  'Bags',
  'Sacks',
  'Super Sacks (Jumbo Bags)',
  'Drums',
  'Crates',
  'Pallets',
  'Cartons',
  'Boxes',
  'Bales',
  'Bundles',
  'Rolls',
  'Barrels',
  'Containers',
  'Bulk (Loose)',
  'Other',
];
