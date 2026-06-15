import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  fetchTour,
  fetchTourStops,
  type StopListItem,
  type TourDetail,
} from '@/features/catalog/queries';
import { createCheckoutIntent } from '@/features/payments/client';
import { colors, lensColor } from '@/theme/colors';
import { fonts, typeScale } from '@/theme/typography';

/**
 * Tour detail — the editorial sales page (docs/06 §3). Live data from the cloud:
 *  - tour + creator credentials + lens tags via fetchTour()
 *  - the full itinerary via get_tour_stops() (migration 0011): preview stops are playable,
 *    the rest show locked. Narration/audio stay gated by RLS.
 */
export default function TourDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [stops, setStops] = useState<StopListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyMsg, setBuyMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchTour(id), fetchTourStops(id)])
      .then(([t, s]) => {
        if (!alive) return;
        setTour(t);
        setStops(s);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function buy() {
    setBuyMsg(null);
    try {
      await createCheckoutIntent(id);
    } catch {
      // The checkout Edge Function isn't deployed yet (Sprint 3).
      setBuyMsg('Checkout isn’t wired yet — coming in Sprint 3.');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error || !tour) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Tour not found'}</Text>
      </View>
    );
  }

  const km = tour.distance_meters ? (tour.distance_meters / 1000).toFixed(1) : null;
  const price =
    tour.price_cents === 0 ? 'Free' : `${(tour.price_cents / 100).toFixed(2)} ${tour.currency}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {tour.cover_image_url ? (
          <Image source={{ uri: tour.cover_image_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}

        <View style={styles.body}>
          {/* lens kicker */}
          <View style={styles.lensRow}>
            {tour.themes.map((t) => {
              const hue = lensColor(t.slug);
              return (
                <View key={t.slug} style={[styles.lensTag, { borderColor: hue }]}>
                  <View style={[styles.lensDot, { backgroundColor: hue }]} />
                  <Text style={[styles.lensText, { color: hue }]}>{t.name}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.title}>{tour.title}</Text>

          {/* logistics strip */}
          <Text style={styles.logistics}>
            {tour.est_duration_min ?? '—'} min
            {km ? ` · ${km} km` : ''} · {tour.difficulty}
            {tour.rating_count > 0
              ? `  ·  ★ ${tour.rating_avg.toFixed(1)} (${tour.rating_count})`
              : ''}
          </Text>

          {/* creator credentials */}
          {tour.creator && (
            <View style={styles.creator}>
              <Text style={styles.creatorBy}>By {tour.creator.display_name}</Text>
              {tour.creator.bio && <Text style={styles.creatorBio}>{tour.creator.bio}</Text>}
            </View>
          )}

          {tour.description && <Text style={styles.description}>{tour.description}</Text>}

          {/* itinerary */}
          <Text style={styles.sectionLabel}>Stops ({stops.length})</Text>
          <View style={styles.stopList}>
            {stops.map((s) => (
              <Pressable
                key={s.id}
                disabled={!s.is_preview}
                onPress={() =>
                  router.push({ pathname: '/player/[tourId]', params: { tourId: id } })
                }
                style={styles.stopRow}
              >
                <Text style={styles.stopSeq}>{s.sequence}</Text>
                <Text style={styles.stopTitle}>{s.title}</Text>
                {s.is_preview ? (
                  <Text style={styles.previewBadge}>▶ preview</Text>
                ) : (
                  <Text style={styles.lock}>🔒</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* sticky buy bar */}
      <View style={[styles.buyBar, { paddingBottom: insets.bottom + 12 }]}>
        {buyMsg && <Text style={styles.buyMsg}>{buyMsg}</Text>}
        <Pressable style={styles.buyButton} onPress={buy}>
          <Text style={styles.buyText}>
            {tour.price_cents === 0 ? 'Start walk' : `Buy · ${price}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  error: { fontFamily: fonts.text, color: colors.danger },
  cover: { width: '100%', height: 220 },
  coverPlaceholder: { backgroundColor: colors.surfaceAlt },
  body: { padding: 20, gap: 12 },
  lensRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lensTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  lensDot: { width: 7, height: 7, borderRadius: 4 },
  lensText: { fontFamily: fonts.textMedium, fontSize: 12 },
  title: { ...typeScale.hero, color: colors.text },
  logistics: { fontFamily: fonts.text, fontSize: 14, color: colors.textMuted },
  creator: {
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    gap: 2,
    marginTop: 4,
  },
  creatorBy: { fontFamily: fonts.textSemibold, fontSize: 15, color: colors.text },
  creatorBio: { fontFamily: fonts.text, fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  description: { fontFamily: fonts.text, fontSize: 16, lineHeight: 25, color: colors.text, marginTop: 4 },
  sectionLabel: { ...typeScale.section, color: colors.textMuted, marginTop: 12 },
  stopList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stopSeq: { fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, width: 18 },
  stopTitle: { flex: 1, fontFamily: fonts.textMedium, fontSize: 16, color: colors.text },
  previewBadge: { fontFamily: fonts.textSemibold, fontSize: 13, color: colors.primary },
  lock: { fontSize: 14 },
  buyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  buyMsg: { fontFamily: fonts.text, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  buyButton: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buyText: { fontFamily: fonts.textSemibold, fontSize: 16, color: colors.primaryText },
});
