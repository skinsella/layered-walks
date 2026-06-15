import type { TextStyle } from 'react-native';

/**
 * Editorial type system (docs/07-visual-language.md §4).
 * Pairing: Fraunces (display serif — names & ideas) + Inter (sans — facts & actions) +
 * Space Mono (Record-mode instrumentation only).
 *
 * Family strings must match the weights loaded by `useFonts` in app/_layout.tsx.
 * Verify exact export names after `npm install` (@expo-google-fonts/*).
 */
export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayRegular: 'Fraunces_400Regular',
  text: 'Inter_400Regular',
  textMedium: 'Inter_500Medium',
  textSemibold: 'Inter_600SemiBold',
  mono: 'SpaceMono_400Regular',
} as const;

/** Reusable text styles. Rule: serif for names/ideas, sans for facts/actions.
 *  Named `typeScale` (not `type`) to avoid clashing with TS's `import { type X }`. */
export const typeScale = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  section: {
    fontFamily: fonts.textSemibold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  body: { fontFamily: fonts.text, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.textMedium, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },

  // FIELD mode oversizes for glanceability (Walk + Record).
  fieldStat: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44 },
  fieldLabel: { fontFamily: fonts.textMedium, fontSize: 18, lineHeight: 24 },
  mono: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

/** Map the families to their @expo-google-fonts module exports for useFonts(). */
export const fontAssets = {
  // import { Fraunces_400Regular, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
  // import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
  // import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
} as const;
