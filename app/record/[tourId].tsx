import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { FieldScreen } from '@/features/field/FieldScreen';
import { WalkMap, type GeoPoint, type MapStop } from '@/components/WalkMap';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchActiveCities } from '@/features/catalog/queries';
import { useAudioRecorder } from '@/features/recording/useAudioRecorder';
import {
  captureLocation,
  ensureCreatorProfile,
  fetchDraftStops,
  getOrCreateDraftTour,
  saveRecordedStop,
  type Coords,
  type RecordedStop,
} from '@/features/recording/recording';
import { field } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export default function Record() {
  const router = useRouter();
  const { session } = useAuth();
  const recorder = useAudioRecorder();

  const [setup, setSetup] = useState<{ userId: string; tourId: string } | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [stops, setStops] = useState<RecordedStop[]>([]);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [title, setTitle] = useState('');
  const [audio, setAudio] = useState<Blob | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prepare a creator profile + draft tour once signed in.
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const cities = await fetchActiveCities();
        const cityId = cities[0]?.id;
        if (!cityId) throw new Error('No active city.');
        const userId = await ensureCreatorProfile();
        const tourId = await getOrCreateDraftTour(userId, cityId);
        setSetup({ userId, tourId });
        setStops(await fetchDraftStops(tourId));
      } catch (e) {
        setSetupError(e instanceof Error ? e.message : 'Could not start recording.');
      }
    })();
  }, [session]);

  async function getLocation() {
    setError(null);
    setBusy('location');
    try {
      setCoords(await captureLocation());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Location failed');
    } finally {
      setBusy(null);
    }
  }

  async function toggleRecord() {
    setError(null);
    try {
      if (recorder.recording) setAudio(await recorder.stop());
      else await recorder.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recording failed');
    }
  }

  async function addPhoto() {
    setError(null);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (!res.canceled && res.assets[0]) {
        const blob = await (await fetch(res.assets[0].uri)).blob();
        setPhoto(blob);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add photo');
    }
  }

  async function save() {
    if (!setup || !coords || !audio) return;
    setBusy('save');
    setError(null);
    try {
      await saveRecordedStop({
        userId: setup.userId,
        tourId: setup.tourId,
        sequence: stops.length + 1,
        title,
        coords,
        audio,
        photo,
      });
      setStops(await fetchDraftStops(setup.tourId));
      setCoords(null);
      setAudio(null);
      setPhoto(null);
      setTitle('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save stop');
    } finally {
      setBusy(null);
    }
  }

  // ── Not signed in ──────────────────────────────────────────────
  if (!session) {
    return (
      <FieldScreen>
        <TopBar onClose={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.prompt}>Sign in to record a tour</Text>
          <Pressable style={styles.primary} onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={styles.primaryText}>Sign in</Text>
          </Pressable>
        </View>
      </FieldScreen>
    );
  }

  const mapStops: MapStop[] = stops.map((s) => ({ lng: s.lng, lat: s.lat }));
  const current: GeoPoint | undefined = coords ? { lng: coords.lng, lat: coords.lat } : undefined;
  const canSave = !!coords && !!audio && busy !== 'save';

  return (
    <FieldScreen>
      <TopBar onClose={() => router.back()} recording={recorder.recording} seconds={recorder.seconds} />
      <Text style={styles.tourName}>My recorded tour</Text>

      <ScrollView contentContainerStyle={styles.body}>
        <WalkMap stops={mapStops} current={current} height={150} field />
        <Text style={styles.count}>
          {stops.length} stop{stops.length === 1 ? '' : 's'} recorded · adding stop {stops.length + 1}
        </Text>

        {setupError && <Text style={styles.error}>{setupError}</Text>}

        {/* 1 · Location */}
        <Text style={styles.step}>1 · Where are you?</Text>
        {coords ? (
          <Text style={styles.coords}>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{Math.round(coords.accuracy)} m ✓
          </Text>
        ) : null}
        <Pressable style={styles.secondaryBtn} onPress={getLocation} disabled={busy === 'location'}>
          <Text style={styles.secondaryText}>
            {busy === 'location' ? 'Locating…' : coords ? '↻ Update my location' : '📍 Use my location'}
          </Text>
        </Pressable>

        {/* 2 · Title */}
        <Text style={styles.step}>2 · Name this stop</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Custom House"
          placeholderTextColor={field.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        {/* 3 · Record */}
        <Text style={styles.step}>3 · Record your narration</Text>
        <View style={styles.recordRow}>
          <Pressable
            style={[styles.recordBtn, recorder.recording && styles.recordBtnActive]}
            onPress={toggleRecord}
          >
            <View style={[styles.recordCore, recorder.recording && styles.recordCoreActive]} />
          </Pressable>
          <Text style={styles.recordHint}>
            {recorder.recording
              ? `Recording… ${recorder.seconds}s — tap to stop`
              : audio
                ? 'Audio captured ✓ — tap to re-record'
                : recorder.supported
                  ? 'Tap to start recording'
                  : 'Recording needs a supported browser'}
          </Text>
        </View>

        {/* 4 · Photo */}
        <Text style={styles.step}>4 · Add a photo (optional)</Text>
        <Pressable style={styles.secondaryBtn} onPress={addPhoto}>
          <Text style={styles.secondaryText}>{photo ? '🖼 Photo added ✓ — change' : '🖼 Add a photo'}</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.primary, !canSave && styles.disabled]} onPress={save} disabled={!canSave}>
          {busy === 'save' ? (
            <ActivityIndicator color={field.accentText} />
          ) : (
            <Text style={styles.primaryText}>Save stop &amp; continue →</Text>
          )}
        </Pressable>
        {!canSave && !busy && (
          <Text style={styles.note}>Capture your location and record audio to save.</Text>
        )}
      </ScrollView>
    </FieldScreen>
  );
}

function TopBar({
  onClose,
  recording,
  seconds,
}: {
  onClose: () => void;
  recording?: boolean;
  seconds?: number;
}) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onClose}>
        <Text style={styles.close}>✕</Text>
      </Pressable>
      <View style={styles.recStatus}>
        {recording && <View style={styles.recDot} />}
        <Text style={styles.recTime}>{recording ? `REC ${seconds}s` : 'ready'}</Text>
      </View>
      <View style={{ width: 24 }} />
    </View>
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

  body: { paddingHorizontal: 24, paddingBottom: 40, gap: 8 },
  count: { fontFamily: fonts.mono, fontSize: 12, color: field.textMuted, marginTop: 8 },
  step: { fontFamily: fonts.textSemibold, fontSize: 14, color: field.text, marginTop: 16 },
  coords: { fontFamily: fonts.mono, fontSize: 14, color: field.accent },

  input: {
    backgroundColor: field.surface,
    borderColor: field.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    color: field.text,
    fontFamily: fonts.text,
  },
  secondaryBtn: {
    backgroundColor: field.surface,
    borderColor: field.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  secondaryText: { fontFamily: fonts.textMedium, fontSize: 15, color: field.text },

  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  recordBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: field.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtnActive: { borderColor: field.recording },
  recordCore: { width: 46, height: 46, borderRadius: 23, backgroundColor: field.recording },
  recordCoreActive: { width: 28, height: 28, borderRadius: 6 },
  recordHint: { flex: 1, fontFamily: fonts.text, fontSize: 14, color: field.textMuted },

  primary: {
    backgroundColor: field.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  disabled: { opacity: 0.5 },
  primaryText: { fontFamily: fonts.textSemibold, fontSize: 16, color: field.accentText },
  note: { fontFamily: fonts.text, fontSize: 12, color: field.textMuted, textAlign: 'center', marginTop: 8 },
  error: { fontFamily: fonts.text, fontSize: 13, color: field.recording, marginTop: 6 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  prompt: { fontFamily: fonts.display, fontSize: 20, color: field.text },
});
