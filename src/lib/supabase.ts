import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { env } from './env';
import type { Database } from '@/types/database';

/**
 * Auth token storage. On native, SecureStore is encrypted at rest (Keychain / Keystore) —
 * the right home for refresh tokens. On web (no SecureStore), fall back to localStorage so
 * sessions persist there too.
 */
const isWeb = Platform.OS === 'web';
const webStorage = (): Storage | undefined =>
  (globalThis as { localStorage?: Storage }).localStorage;

const SecureStoreAdapter = {
  getItem: (key: string) =>
    isWeb
      ? Promise.resolve(webStorage()?.getItem(key) ?? null)
      : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => {
    if (isWeb) {
      webStorage()?.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (isWeb) {
      webStorage()?.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
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
