import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { fetchActiveCities, fetchThemes } from '@/features/catalog/queries';
import { generateRoute, type GeneratedRoute } from '@/features/route-engine/client';
import { LensChip } from '@/components/LensChip';
import { WalkMap } from '@/components/WalkMap';
import type { Theme } from '@/types/database';
import { colors } from '@/theme/colors';
import { fonts, typeScale } from '@/theme/typography';

const DURATIONS = [30, 60, 90, 120];
const INTENSITIES = ['easy', 'moderate', 'strenuous'] as const;
// Default origin = Limerick city centre (real GPS via expo-location on device).
const DEFAULT_ORIGIN = { lng: -8.6267, lat: 52.6638 };

export default function BuildWalk() {
  const router = useRouter();
  const [cityId, setCityId] = useState<string | undefined>();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [lenses, setLenses] = useState<Set<string>>(new Set());
  const [minutes, setMinutes] = useState(60);
  const [intensity, setIntensity] = useState<(typeof INTENSITIES)[number]>('moderate');
  const [route, setRoute] = useState<GeneratedRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveCities().then((c) => c[0] && setCityId(c[0].id)).catch(() => {});
    fetchThemes().then(setThemes).catch(() => {});
  }, []);

  function toggleLens(idv: string) {
    setLenses((prev) => {
      const next = new Set(prev);
      if (next.has(idv)) next.delete(idv);
      else next.add(idv);
      return next;
    });
  }

  async function generate() {
    if (!cityId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generateRoute({
        cityId,
        themeIds: [...lenses],
        maxMinutes: minutes,
        intensity,
        origin: DEFAULT_ORIGIN,
      });
      setRoute(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build a walk');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 22 }}>
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

      <View>
        <Text style={styles.label}>Lenses (optional — your focus)</Text>
        <View style={styles.lensWrap}>
          {themes.map((t) => (
            <LensChip
              key={t.id}
              slug={t.slug}
              label={t.name}
              icon={t.icon}
              active={lenses.has(t.id)}
              onPress={() => toggleLens(t.id)}
            />
          ))}
        </View>
      </View>

      <Pressable style={[styles.generate, !cityId && styles.generateDisabled]} onPress={generate} disabled={busy || !cityId}>
        {busy ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={styles.generateText}>Generate my walk</Text>
        )}
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {route && (
        <View style={styles.result}>
          {route.stops.length === 0 ? (
            <Text style={styles.muted}>No stops match those lenses yet. Try fewer lenses.</Text>
          ) : (
            <>
              <WalkMap
                stops={route.stops.map((s) => ({ lng: s.lng, lat: s.lat }))}
                current={DEFAULT_ORIGIN}
                height={180}
              />
              <Text style={styles.resultTitle}>
                {route.stops.length} stops · {(route.totalDistanceM / 1000).toFixed(1)} km · ~
                {route.totalDurationMin} min
              </Text>
              {route.stops.map((s) => (
                <View key={s.stopId} style={styles.routeStop}>
                  <Text style={styles.routeSeq}>{s.sequence + 1}</Text>
                  <Text style={styles.routeStopTitle}>{s.title}</Text>
                </View>
              ))}
              <Pressable
                style={styles.start}
                onPress={() => router.push({ pathname: '/player/[tourId]', params: { tourId: 'generated' } })}
              >
                <Text style={styles.startText}>Start this walk</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  label: { ...typeScale.section, color: colors.textMuted, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  lensWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  opt: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  optActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optText: { fontFamily: fonts.textMedium, color: colors.text },
  optTextActive: { color: colors.primaryText },
  generate: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  generateDisabled: { opacity: 0.5 },
  generateText: { fontFamily: fonts.textSemibold, fontSize: 16, color: colors.primaryText },
  error: { fontFamily: fonts.text, color: colors.danger },
  result: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  muted: { fontFamily: fonts.text, color: colors.textMuted },
  resultTitle: { fontFamily: fonts.textSemibold, fontSize: 15, color: colors.text },
  routeStop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeSeq: { fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, width: 18 },
  routeStopTitle: { fontFamily: fonts.text, fontSize: 15, color: colors.text },
  start: { backgroundColor: colors.text, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 6 },
  startText: { fontFamily: fonts.textSemibold, fontSize: 15, color: colors.bg },
});
