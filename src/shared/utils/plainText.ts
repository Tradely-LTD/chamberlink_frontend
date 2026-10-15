/**
 * Stored text (seed data, admin-entered descriptions) can carry typographic
 * dashes that read as machine-written. Shown on cards, they become plain
 * punctuation: " — " and " – " between clauses become ", ", a dash between
 * two places ("Nigeria — Ghana") becomes an en dash.
 */
export const plainText = (s: string | null | undefined): string =>
  (s ?? '')
    .replace(/(\p{Lu}[\p{L}.]*)\s+[—–]\s+(\p{Lu}[\p{L}.]*)(?=\s|$|\))/gu, '$1–$2')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s+–\s+/g, ', ')
    .replace(/,\s*,/g, ',');
