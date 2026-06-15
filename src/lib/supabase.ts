import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { env } from './env';
import type { Database } from '@/types/database';

/**
 * Auth token storage. SecureStore is encrypted at rest (Keychain / Keystore),
 * which is the right home for refresh tokens. SecureStore has a ~2KB value
 * limit and is native-only, so we no-op on web.
 */
const SecureStoreAdapter = {
  getItem: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === 'web'
      ? Promise.resolve()
      : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve()
      : SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
