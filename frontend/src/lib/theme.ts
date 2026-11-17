// ZLC / STMC brand palette — consistent green + white, with status colors
// reserved for On Track / Needs Attention / At Risk and never reused as a
// chart "series color".
export const GREEN = '#1b4332';
export const GREEN_DARK = '#10291d';
export const ACCENT = '#2f9e44';
export const ACCENT_LIGHT = '#95d5b2';
export const ACCENT_LIGHT_DARK = '#52b788';

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
  At: ACCENT,
  Above: '#2e7d32',
};

// Categorical palette for the 4 schools — shades within the green brand
// family, distinguished by lightness so series stay consistent with the
// rest of the UI. Assigned by school id in FIXED order — color follows
// the school entity, never its rank. Always paired with legend/table labels.
export const SCHOOL_COLORS = [GREEN, ACCENT, '#74c69d', '#52796f'];
export function schoolColor(schoolId: number): string {
  return SCHOOL_COLORS[(schoolId - 1) % SCHOOL_COLORS.length];
}

// Recessive chart chrome.
export const GRID = '#eef1f4';
export const AXIS = '#e2e6ea';
export const INK_MUTED = '#5b6572';
