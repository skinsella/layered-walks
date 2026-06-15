import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { generateRoute, type GeneratedRoute } from '@/features/route-engine/client';
import { colors } from '@/theme/colors';

const DURATIONS = [30, 60, 90, 120];
const INTENSITIES = ['easy', 'moderate', 'strenuous'] as const;

/**
 * The "layered" flow: pick time + intensity + themes → generate a route.
 * This is the product differentiator (docs/02-architecture.md §4).
 * Sprint 5 wires the theme multi-select, GPS origin, and route preview map.
 */
export default function BuildWalk() {
  const [minutes, setMinutes] = useState(60);
  const [intensity, setIntensity] = useState<(typeof INTENSITIES)[number]>('moderate');
  const [route, setRoute] = useState<GeneratedRoute | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const result = await generateRoute({
        cityId: 'REPLACE_WITH_CITY_ID',
        themeIds: [], // TODO(sprint 5): wire theme multi-select
        maxMinutes: minutes,
        intensity,
        origin: { lng: -8.6267, lat: 52.6638 }, // TODO: real GPS via expo-location
      });
      setRoute(result);
    } catch (e) {
      console.warn('route generation failed', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View>
        <Text style={styles.label}>How much time?</Text>
        <View style={styles.row}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              style={[styles.opt, minutes === d && styles.optActive]}
              onPress={() => setMinutes(d)}
            >
              <Text style={[styles.optText, minutes === d && styles.optTextActive]}>{d}m</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.label}>Walking intensity</Text>
        <View style={styles.row}>
          {INTENSITIES.map((i) => (
            <Pressable
              key={i}
              style={[styles.opt, intensity === i && styles.optActive]}
              onPress={() => setIntensity(i)}
            >
              <Text style={[styles.optText, intensity === i && styles.optTextActive]}>{i}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* TODO(sprint 5): theme multi-select chips here. */}

      <Pressable style={styles.generate} onPress={generate} disabled={busy}>
        <Text style={styles.generateText}>
          {busy ? 'Composing…' : 'Generate my walk'}
        </Text>
      </Pressable>

      {route && (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>
            {route.stops.length} stops · {route.totalDurationMin} min ·{' '}
            {(route.totalDistanceM / 1000).toFixed(1)} km
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  label: { color: colors.text, fontWeight: '700', marginBottom: 8, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  opt: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  optActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optText: { color: colors.text },
  optTextActive: { color: colors.primaryText, fontWeight: '700' },
  generate: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  generateText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  result: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  resultTitle: { color: colors.text, fontWeight: '600' },
});
