import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

/**
 * "My Tours" — purchased + downloaded tours, read from the local offline cache
 * first (expo-sqlite), then reconciled with `purchases` when online.
 * Wire up in Sprint 4 (offline) — see docs/03-build-plan.md.
 */
export default function Library() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.center}>
        <Text style={styles.title}>Your purchased & downloaded tours</Text>
        <Text style={styles.muted}>
          Sprint 4 wires this to the offline cache and purchase history.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  muted: { color: colors.textMuted, textAlign: 'center' },
});
