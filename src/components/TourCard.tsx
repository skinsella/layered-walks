import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts, typeScale } from '@/theme/typography';
import type { TourCard as TourCardModel } from '@/types/database';

/**
 * Editorial tour card (docs/06 §2, docs/07 §4): tall, magazine-style. Leads with the
 * intellectual hook (kicker/summary), then logistics, then price — never a dense grid tile.
 */
export function TourCard({
  tour,
  kicker,
  onPress,
}: {
  tour: TourCardModel;
  kicker?: string; // e.g. a sub-themes line: "Shannon · FDI · decline"
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {tour.cover_image_url ? (
        <Image source={{ uri: tour.cover_image_url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}

      <View style={styles.body}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title}>{tour.title}</Text>
        {tour.summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {tour.summary}
          </Text>
        ) : null}

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {tour.est_duration_min ?? '—'} min · {tour.difficulty}
          </Text>
          <View style={styles.metaRight}>
            {tour.rating_count > 0 && (
              <Text style={styles.rating}>
                ★ {tour.rating_avg.toFixed(1)} ({tour.rating_count})
              </Text>
            )}
            <Text style={styles.price}>
              {tour.price_cents === 0
                ? 'Free'
                : `${(tour.price_cents / 100).toFixed(2)} ${tour.currency}`}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 160 },
  coverPlaceholder: { backgroundColor: colors.surfaceAlt },
  body: { padding: 16, gap: 6 },
  kicker: { ...typeScale.section, color: colors.primary },
  title: { ...typeScale.title, color: colors.text },
  summary: { ...typeScale.caption, color: colors.textMuted },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  metaText: { fontFamily: fonts.text, fontSize: 13, color: colors.textMuted },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rating: { fontFamily: fonts.textMedium, fontSize: 13, color: colors.textMuted },
  price: { fontFamily: fonts.textSemibold, fontSize: 15, color: colors.primary },
});
