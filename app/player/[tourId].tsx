import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '@/theme/colors';

/**
 * GPS-triggered audio player (full-screen). Sprint 4:
 *  - Register each stop's geofence (expo-location, trigger_radius_m).
 *  - On region enter → autoplay stop audio (expo-av) from the OFFLINE cache.
 *  - Map (rnmapbox) shows route + user position; controls: play/pause/replay.
 *  - Write tour_progress; completion fires at 100% → north-star metric.
 * Everything here must work with zero connectivity for owned tours.
 */
export default function Player() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.muted}>Map + route for tour {tourId}</Text>
      </View>

      <View style={styles.nowPlaying}>
        <Text style={styles.stopTitle}>Approaching your next stop…</Text>
        <Text style={styles.muted}>
          Audio auto-plays when you arrive. Works fully offline once downloaded.
        </Text>
        <View style={styles.controls}>
          <Pressable style={styles.ctrl}><Text style={styles.ctrlText}>⏮ Replay</Text></Pressable>
          <Pressable style={[styles.ctrl, styles.ctrlPrimary]}><Text style={styles.ctrlText}>⏯ Play</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  close: { position: 'absolute', top: 56, right: 20, zIndex: 10 },
  closeText: { color: colors.text, fontSize: 22 },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowPlaying: { padding: 24, gap: 8 },
  stopTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  muted: { color: colors.textMuted },
  controls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ctrl: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  ctrlPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  ctrlText: { color: colors.text, fontWeight: '600' },
});
