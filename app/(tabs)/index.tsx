import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';

import { fetchActiveCities, fetchPublishedTours, fetchThemes } from '@/features/catalog/queries';
import { LensChip } from '@/components/LensChip';
import { TourCard } from '@/components/TourCard';
import type { Theme, TourCard as TourCardModel } from '@/types/database';
import { colors } from '@/theme/colors';
import { fonts, typeScale } from '@/theme/typography';

export default function Discover() {
  const router = useRouter();
  const [cityId, setCityId] = useState<string | undefined>();
  const [cityName, setCityName] = useState('Limerick');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [tours, setTours] = useState<TourCardModel[]>([]);
  const [activeLens, setActiveLens] = useState<Theme | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve the active launch city (Limerick at MVP) from the DB — no hard-coded id.
  useEffect(() => {
    fetchActiveCities()
      .then((cities) => {
        if (cities[0]) {
          setCityId(cities[0].id);
          setCityName(cities[0].name);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load cities'));
    fetchThemes().then(setThemes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cityId) return;
    setLoading(true);
    fetchPublishedTours(cityId, activeLens?.id)
      .then(setTours)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [cityId, activeLens]);

  // The section voice changes with the active lens (docs/06 §2).
  const sectionTitle = activeLens
    ? `${cityName} through ${activeLens.name}`
    : `Featured in ${cityName}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={tours}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topRow}>
              <Text style={styles.wordmark}>{cityName}</Text>
              <Link href="/(tabs)/profile" asChild>
                <Pressable>
                  <Text style={styles.profileLink}>◐</Text>
                </Pressable>
              </Link>
            </View>

            {/* Generative entry — present but SECONDARY (hero = curated). */}
            <Pressable style={styles.buildCta} onPress={() => router.push('/build-walk')}>
              <Text style={styles.buildCtaText}>Build a walk for the time you have</Text>
              <Text style={styles.buildCtaArrow}>→</Text>
            </Pressable>

            <Text style={styles.lensesLabel}>Lenses</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lensRow}
            >
              {themes.map((t) => (
                <LensChip
                  key={t.id}
                  slug={t.slug}
                  label={t.name}
                  icon={t.icon}
                  active={t.id === activeLens?.id}
                  onPress={() => setActiveLens(activeLens?.id === t.id ? undefined : t)}
                />
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TourCard
            tour={item}
            onPress={() =>
              router.push({ pathname: '/tour/[id]', params: { id: item.id } })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={styles.note}>{error}</Text>
          ) : (
            <Text style={styles.note}>
              No tours yet. Seed the flagship Limerick tours to begin.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: 16, paddingTop: 8 },
  header: { gap: 16, marginBottom: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { ...typeScale.hero, color: colors.text },
  profileLink: { fontSize: 22, color: colors.textMuted },
  buildCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  buildCtaText: { fontFamily: fonts.textMedium, fontSize: 15, color: colors.text },
  buildCtaArrow: { fontFamily: fonts.text, fontSize: 18, color: colors.primary },
  lensesLabel: { ...typeScale.section, color: colors.textMuted },
  lensRow: { gap: 8, paddingRight: 16 },
  sectionTitle: { ...typeScale.title, color: colors.text, marginTop: 4 },
  note: { fontFamily: fonts.text, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
