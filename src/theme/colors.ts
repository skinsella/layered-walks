/** Minimal palette. Swap for a design system later — keep references centralized. */
export const colors = {
  bg: '#0E1116',
  surface: '#171B22',
  border: '#262C36',
  text: '#F2F4F7',
  textMuted: '#9AA4B2',
  primary: '#E0A458', // warm "lantern" amber — place-storytelling tone
  primaryText: '#1A1206',
  success: '#3FB984',
  danger: '#E5484D',
} as const;

export type AppColor = keyof typeof colors;
