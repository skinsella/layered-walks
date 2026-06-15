import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { fetchPublishedTours, fetchThemes } from '@/features/catalog/queries';
import type { Theme, TourCard } from '@/types/database';
import { colors } from '@/theme/colors';

// MVP launches with a single active city (Limerick). Once multi-city, add a picker.
const LIMERICK_PLACEHOLDER = 'REPLACE_WITH_CITY_ID_FROM_DB';

export default function Discover() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [tours, setTours] = useState<TourCard[]>([]);
  const [activeTheme, setActiveTheme] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchThemes().then(setThemes).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPublishedTours(LIMERICK_PLACEHOLDER, activeTheme)
      .then(setTours)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [activeTheme]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Link href="/build-walk" asChild>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>Build a walk for the time I have →</Text>
        </Pressable>
      </Link>

      <FlatList
        horizontal
        data={themes}
        keyExtractor={(t) => t.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.themeRow}
        renderItem={({ item }) => {
          const active = item.id === activeTheme;
          return (
            <Pressable
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setActiveTheme(active ? undefined : item.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.icon ? `${item.icon} ` : ''}
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No tours yet. Seed flagship tours to begin.</Text>
          }
          renderItem={({ item }) => (
            <Link href={{ pathname: '/tour/[id]', params: { id: item.id } }} asChild>
              <Pressable style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.summary && <Text style={styles.cardSummary}>{item.summary}</Text>}
                <View style={styles.cardMeta}>
                  <Text style={styles.cardMetaText}>
                    {item.est_duration_min ?? '—'} min · {item.difficulty}
                  </Text>
                  <Text style={styles.price}>
                    {(item.price_cents / 100).toFixed(2)} {item.currency}
                  </Text>
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cta: {
    margin: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
  },
  ctaText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  themeRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextActive: { color: colors.primaryText, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  cardSummary: { color: colors.textMuted },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cardMetaText: { color: colors.textMuted },
  price: { color: colors.primary, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  error: { color: colors.danger, textAlign: 'center', marginTop: 40 },
});
