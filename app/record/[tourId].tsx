import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FieldScreen } from '@/features/field/FieldScreen';
import { field } from '@/theme/colors';
import { fonts, typeScale } from '@/theme/typography';

/**
 * Record mode — the creator's field screen, the deliberate MIRROR of the Player
 * (docs/07 §7). Same Field shell; inverted job:
 *   listener's now-playing  → creator's record button
 *   GPS triggers playback   → GPS stamps the coordinate
 *   audio scrubber          → live waveform
 *
 * Real capture (expo-av record + expo-location stamp + Storage upload) is Sprint 6.
 * This wires the layout + interaction shell against the Field tokens.
 */
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
        <Text style={styles.stat}>Stop {stopIndex}</Text>
        {/* Live GPS auto-stamped — no manual pin-dropping (the creator-side magic). */}
        <Text style={styles.coords}>52.6638, −8.6267   ±4 m</Text>
        <Text style={styles.working}>Custom House (working title)</Text>

        <Pressable
          style={[styles.recordBtn, recording && styles.recordBtnActive]}
          onPress={() => setRecording((r) => !r)}
        >
          <View style={[styles.recordCore, recording && styles.recordCoreActive]} />
        </Pressable>

        <View style={styles.waveform}>
          <Text style={styles.waveText}>
            {recording ? '〔 ▁▂▅▇▇▅▂▁ 〕 0:42' : 'tap to record this stop'}
          </Text>
        </View>

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
            setStopIndex((i) => i + 1); // commit; GPS re-stamps the next stop on arrival
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

  body: { flex: 1, paddingHorizontal: 24, alignItems: 'center', paddingTop: 16 },
  stat: { ...typeScale.fieldStat, color: field.text, marginTop: 12 },
  coords: { fontFamily: fonts.mono, fontSize: 14, color: field.accent, marginTop: 12 },
  working: { fontFamily: fonts.text, fontSize: 15, color: field.textMuted, marginTop: 6 },

  recordBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: field.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
  },
  recordBtnActive: { borderColor: field.recording },
  recordCore: { width: 92, height: 92, borderRadius: 46, backgroundColor: field.recording },
  recordCoreActive: { width: 56, height: 56, borderRadius: 12 },

  waveform: { height: 40, justifyContent: 'center', marginTop: 20 },
  waveText: { fontFamily: fonts.mono, fontSize: 15, color: field.textMuted },

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
