import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { field } from '@/theme/colors';

/**
 * The shared Field Mode shell (docs/07 §7). BOTH Walk (Player) and Record (creator) live
 * here: warm-ink surface, light status bar, edge-to-edge. One world, two jobs.
 */
export function FieldScreen({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: field.bg }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
    </View>
  );
}
