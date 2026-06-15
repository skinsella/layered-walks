import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FieldScreen } from '@/features/field/FieldScreen';
import { WalkMap, type GeoPoint, type MapStop } from '@/components/WalkMap';
import { field } from '@/theme/colors';
import { fonts, typeScale } from '@/theme/typography';

// Demo route geometry (real values load from the downloaded tour on device).
const ROUTE: MapStop[] = [
  { lng: -8.6267, lat: 52.6638 },
  { lng: -8.6285, lat: 52.6655 },
  { lng: -8.6255, lat: 52.662 },
  { lng: -8.623, lat: 52.6585 },
];
const HERE: GeoPoint = { lng: -8.6272, lat: 52.6646 }; // between stops

/**
 * Walk mode — audio-first minimal (docs/06 §1, docs/07 §7). Two states:
 *  • walking  — calm resting screen, big glanceable progress, "phone can stay in your pocket"
 *  • at-stop  — one image, audio scrubber, large transport controls; transcript/map are pull
 *
 * GPS geofencing (Sprint 4) flips these automatically. Until then a dev control simulates
 * arrival so the two states are visible on device.
 */
export default function Player() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<'walking' | 'at-stop'>('walking');
  const [playing, setPlaying] = useState(true);

  return (
    <FieldScreen>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityLabel={`Close walk ${tourId}`}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.tourName}>Economic Transformation</Text>
        <View style={{ width: 24 }} />
      </View>

      {phase === 'walking' ? (
        <View style={styles.body}>
          <Text style={styles.stat}>3 of 7 stops</Text>
          <Text style={styles.nextLabel}>Next: Bank Place</Text>
          <Text style={styles.nextMeta}>~4 min walk · 250 m</Text>
          <Text style={styles.reassure}>Keep walking — I&apos;ll start when you arrive.</Text>

          <View style={styles.mapStrip}>
            <WalkMap stops={ROUTE} current={HERE} height={150} field />
          </View>

          <View style={styles.controlsRow}>
            <FieldButton label="⏸  Pause walk" onPress={() => {}} />
            <FieldButton label="⏮  Replay" onPress={() => setPhase('at-stop')} />
          </View>

          {/* DEV ONLY — simulate geofence arrival until GPS is wired (Sprint 4). */}
          <Pressable style={styles.devBtn} onPress={() => setPhase('at-stop')}>
            <Text style={styles.devText}>▶︎ simulate arrival (dev)</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.image}>
            <Text style={styles.imageCaption}>Bank Place, 1860s</Text>
          </View>

          <Text style={styles.stopKicker}>STOP 3 · Economics · Georgian</Text>
          <Text style={styles.stopTitle}>Bank Place</Text>

          <View style={styles.scrubber}>
            <View style={styles.scrubFill} />
          </View>
          <Text style={styles.time}>2:14 / 5:40</Text>

          <View style={styles.transport}>
            <FieldButton label="⏮" onPress={() => {}} compact />
            <FieldButton
              label={playing ? '⏸' : '▶︎'}
              onPress={() => setPlaying((p) => !p)}
              primary
            />
            <FieldButton label="⏭" onPress={() => {}} compact />
          </View>

          <Pressable onPress={() => {}}>
            <Text style={styles.pull}>▾ Read transcript</Text>
          </Pressable>
          <Pressable onPress={() => setPhase('walking')}>
            <Text style={styles.pull}>▾ Done — keep walking</Text>
          </Pressable>
        </View>
      )}
    </FieldScreen>
  );
}

function FieldButton({
  label,
  onPress,
  primary,
  compact,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.btn,
        compact && styles.btnCompact,
        primary && styles.btnPrimary,
      ]}
    >
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  close: { color: field.text, fontSize: 22, width: 24 },
  tourName: { fontFamily: fonts.display, fontSize: 16, color: field.text },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },

  // walking state
  stat: { ...typeScale.fieldStat, color: field.text, marginTop: 24 },
  nextLabel: { ...typeScale.fieldLabel, color: field.text, marginTop: 24 },
  nextMeta: { fontFamily: fonts.text, fontSize: 14, color: field.textMuted, marginTop: 4 },
  reassure: {
    fontFamily: fonts.displayRegular,
    fontSize: 18,
    color: field.textMuted,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 26,
  },
  mapStrip: { width: '100%', marginTop: 'auto' },
  controlsRow: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  devBtn: { marginTop: 16, marginBottom: 8 },
  devText: { fontFamily: fonts.mono, fontSize: 12, color: field.textMuted },

  // at-stop state
  image: {
    width: '100%',
    height: 200,
    backgroundColor: field.surface,
    borderRadius: 12,
    justifyContent: 'flex-end',
    padding: 12,
  },
  imageCaption: { fontFamily: fonts.text, fontSize: 12, color: field.textMuted },
  stopKicker: { ...typeScale.section, color: field.accent, marginTop: 20 },
  stopTitle: { ...typeScale.title, color: field.text, marginTop: 4 },
  scrubber: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: field.border,
    marginTop: 24,
  },
  scrubFill: { width: '40%', height: 4, borderRadius: 2, backgroundColor: field.accent },
  time: { fontFamily: fonts.mono, fontSize: 13, color: field.textMuted, marginTop: 8 },
  transport: { flexDirection: 'row', gap: 20, alignItems: 'center', marginTop: 24 },
  pull: { fontFamily: fonts.text, fontSize: 15, color: field.textMuted, marginTop: 20 },

  // buttons
  btn: {
    flex: 1,
    borderColor: field.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnCompact: { flex: 0, paddingHorizontal: 22 },
  btnPrimary: { backgroundColor: field.accent, borderColor: field.accent },
  btnText: { fontFamily: fonts.textMedium, fontSize: 16, color: field.text },
  btnTextPrimary: { color: field.accentText, fontSize: 20 },
});
