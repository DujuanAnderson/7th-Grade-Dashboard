// ZLC / STMC brand palette (spec §9: navy, teal, gold) + reserved status colors.
export const NAVY = '#1e3a5f';
export const NAVY_DARK = '#152b46';
export const TEAL = '#2a9d8f';
export const GOLD = '#e9c46a';
export const GOLD_DARK = '#c9a227';

// Status colors are RESERVED for On Track / Needs Attention / At Risk and are
// never reused as a chart "series color".
export const STATUS = {
  'On Track': { fg: '#1b5e20', bg: '#e6f4ea', dot: '#2e7d32' },
  'Needs Attention': { fg: '#8a5a00', bg: '#fdf3e0', dot: '#e0a100' },
  'At Risk': { fg: '#a01d1d', bg: '#fdeaea', dot: '#c62828' },
} as const;

// Reading-level bands, low→high (ordinal). Used by the band chart + roster.
export const BAND_COLOR: Record<string, string> = {
  Below: '#c62828',
  Approaching: '#e0a100',
  At: TEAL,
  Above: '#2e7d32',
};

// Categorical palette for the 4 schools (validated: passes CVD + lightness +
// normal-vision checks). Assigned by school id in FIXED order — color follows
// the school entity, never its rank. The amber's low surface-contrast is
// covered by the always-present legend labels + KPI table view.
export const SCHOOL_COLORS = ['#3a6ea5', '#2a9d8f', '#e0a030', '#9b5bb0'];
export function schoolColor(schoolId: number): string {
  return SCHOOL_COLORS[(schoolId - 1) % SCHOOL_COLORS.length];
}

// Recessive chart chrome.
export const GRID = '#eef1f4';
export const AXIS = '#e2e6ea';
export const INK_MUTED = '#5b6572';
