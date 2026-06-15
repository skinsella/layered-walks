/**
 * Editorial / authoritative colour system (docs/07-visual-language.md §2–3).
 * Two surfaces — the app physically lives in two places:
 *   • PAPER (`colors`) — Plan & Reflect: reading, browsing, deciding.
 *   • FIELD (`field`)  — Walk & Record: out in the city, eyes-up, two-sided.
 * Plus the 7 lens hues (`lenses`), keyed to themes.slug.
 */

// PAPER surface — default for Plan & Reflect screens.
export const colors = {
  bg: '#FAF7F1', // warm paper
  surface: '#FFFFFF', // raised cards
  surfaceAlt: '#F3EEE4', // subtle fills, chips
  border: '#E6DFD2', // hairlines
  text: '#1B1712', // warm ink — primary
  textMuted: '#6E6557', // secondary ink
  primary: '#B0742A', // lantern ochre — the one accent
  primaryText: '#FFFFFF', // on accent
  success: '#2F6E5A',
  danger: '#A23B36',
} as const;

// FIELD surface — Walk (listen) and Record (create) both live here.
export const field = {
  bg: '#14110C', // warm ink
  surface: '#1E1A13',
  border: '#332C20',
  text: '#F5F0E6', // paper-white
  textMuted: '#A89D88',
  accent: '#E0A458', // lantern amber (brighter on dark) — brand continuity
  accentText: '#1A1206',
  recording: '#D8534A', // the REC state — creator Record mode only
} as const;

// The seven lenses — museum-muted hues. Keys match themes.slug (see supabase/seed.sql).
export const lenses = {
  history: '#8C7A5B', // stone / sepia
  economics: '#2F6E66', // verdigris
  architecture: '#4A5A78', // slate blue
  politics: '#8A3B3B', // oxblood
  food: '#B5642E', // paprika
  literature: '#3E3A6E', // ink indigo
  'hidden-gems': '#5E6B3A', // moss
} as const;

export type AppColor = keyof typeof colors;
export type FieldColor = keyof typeof field;
export type LensSlug = keyof typeof lenses;

/** Lens hue lookup with a neutral fallback for unknown slugs. */
export function lensColor(slug: string): string {
  return (lenses as Record<string, string>)[slug] ?? colors.textMuted;
}
