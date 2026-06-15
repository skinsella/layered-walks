/**
 * Typed access to public client env vars. EXPO_PUBLIC_* are inlined at build time.
 * Fails fast in dev if a required var is missing.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required(
    'EXPO_PUBLIC_SUPABASE_URL',
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  mapboxToken: required(
    'EXPO_PUBLIC_MAPBOX_TOKEN',
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
  ),
} as const;
