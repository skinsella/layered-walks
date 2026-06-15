import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FieldScreen } from '@/features/field/FieldScreen';
import { WalkMap, type GeoPoint, type MapStop } from '@/components/WalkMap';
import { field } from '@/theme/colors';
import { fonts } from '@/theme/typography';

/**
 * Record mode — the creator's field screen, the MIRROR of the Player (docs/07 §7).
 * GPS *stamps* each stop's coordinate as you stand there, and a breadcrumb track is
 * accumulated as you walk — so the geographic area is captured well (migration 0012).
 *
 * Real capture (expo-location track + per-stop coordinate/accuracy + expo-av audio →
 * Storage upload) is Sprint 6. The map below uses demo geometry to show the shape.
 */

// Demo geometry (real values come from expo-location on device).
const CAPTURED: MapStop[] = [
  { lng: -8.6267, lat: 52.6638 }, // 1 · Bank Place
  { lng: -8.6255, lat: 52.662 }, // 2 · Cruise's Street
];
const CURRENT: GeoPoint = { lng: -8.6285, lat: 52.6655 }; // recording here now
const TRACK: GeoPoint[] = [
  { lng: -8.6267, lat: 52.6638 },
  { lng: -8.6261, lat: 52.6629 },
  { lng: -8.6255, lat: 52.662 },
  { lng: -8.6266, lat: 52.6634 },
  { lng: -8.6278, lat: 52.6647 },
  { lng: -8.6285, lat: 52.6655 },
];

export default function Record() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [stopIndex, setStopIndex] = useState(3);

  return (
    <FieldScreen>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityLabel={`Close recording ${tourId}`}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <View style={styles.recStatus}>
          {recording && <View style={styles.recDot} />}
          <Text style={styles.recTime}>{recording ? 'REC 0:42' : 'ready'}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.tourName}>The Georgian City</Text>

      <View style={styles.body}>
        {/* The geography being captured: walked track + captured pins + live position. */}
        <WalkMap stops={CAPTURED} path={TRACK} current={CURRENT} height={150} field />
        <Text style={styles.mapHint}>2 stops captured · recording stop {stopIndex}</Text>

        <Text style={styles.coords}>52.6655, −8.6285</Text>
        <Text style={styles.accuracy}>● GPS strong · ±4 m</Text>
        <Text style={styles.working}>Custom House (working title)</Text>

        <Pressable
          style={[styles.recordBtn, recording && styles.recordBtnActive]}
          onPress={() => setRecording((r) => !r)}
        >
          <View style={[styles.recordCore, recording && styles.recordCoreActive]} />
        </Pressable>

        <Text style={styles.waveText}>
          {recording ? '〔 ▁▂▅▇▇▅▂▁ 〕 0:42' : 'tap to record this stop'}
        </Text>

        <View style={styles.secondaryRow}>
          <Pressable onPress={() => setRecording(false)}>
            <Text style={styles.secondary}>· Retake</Text>
          </Pressable>
          <Pressable onPress={() => {}}>
            <Text style={styles.secondary}>· Add photo</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.saveBtn}
          onPress={() => {
            setRecording(false);
            setStopIndex((i) => i + 1);
          }}
        >
          <Text style={styles.saveText}>Save stop &amp; walk on  →</Text>
        </Pressable>
      </View>
    </FieldScreen>
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
  recStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: field.recording },
  recTime: { fontFamily: fonts.mono, fontSize: 14, color: field.textMuted },
  tourName: { fontFamily: fonts.display, fontSize: 16, color: field.text, textAlign: 'center' },

  body: { flex: 1, paddingHorizontal: 24, alignItems: 'center', paddingTop: 12 },
  mapHint: { fontFamily: fonts.mono, fontSize: 12, color: field.textMuted, marginTop: 8 },

  coords: { fontFamily: fonts.mono, fontSize: 15, color: field.accent, marginTop: 14 },
  accuracy: { fontFamily: fonts.text, fontSize: 12, color: '#5FB58F', marginTop: 4 },
  working: { fontFamily: fonts.text, fontSize: 15, color: field.textMuted, marginTop: 4 },

  recordBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: field.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  recordBtnActive: { borderColor: field.recording },
  recordCore: { width: 76, height: 76, borderRadius: 38, backgroundColor: field.recording },
  recordCoreActive: { width: 46, height: 46, borderRadius: 10 },

  waveText: { fontFamily: fonts.mono, fontSize: 14, color: field.textMuted, marginTop: 14 },

  secondaryRow: { flexDirection: 'row', gap: 28, marginTop: 12 },
  secondary: { fontFamily: fonts.textMedium, fontSize: 15, color: field.textMuted },

  saveBtn: {
    marginTop: 'auto',
    marginBottom: 16,
    width: '100%',
    backgroundColor: field.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: { fontFamily: fonts.textSemibold, fontSize: 16, color: field.accentText },
});
