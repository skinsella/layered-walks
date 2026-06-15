import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { createCheckoutIntent } from '@/features/payments/client';
import { colors } from '@/theme/colors';

/**
 * Tour detail. Pre-purchase, RLS returns only preview stops (see schema §9).
 * On "Buy": call checkout → confirm with Stripe RN SDK → content unlocked by webhook.
 * Flesh out data fetching in Sprint 2, payment confirm in Sprint 3.
 */
export default function TourDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  async function buy() {
    try {
      const intent = await createCheckoutIntent(id);
      // TODO(sprint 3): present Stripe PaymentSheet with intent.paymentIntentClientSecret.
      console.log('checkout intent', intent);
    } catch (e) {
      console.warn('checkout failed', e);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={styles.title}>Tour {id}</Text>
      <Text style={styles.muted}>
        Sprint 2: cover image, summary, themes, map preview, preview stops, ratings.
      </Text>

      <View style={styles.row}>
        <Pressable style={styles.buy} onPress={buy}>
          <Text style={styles.buyText}>Buy tour</Text>
        </Pressable>
        <Pressable
          style={styles.preview}
          onPress={() => router.push({ pathname: '/player/[tourId]', params: { tourId: id } })}
        >
          <Text style={styles.previewText}>Preview</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  muted: { color: colors.textMuted },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  buy: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 16, alignItems: 'center' },
  buyText: { color: colors.primaryText, fontWeight: '700' },
  preview: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  previewText: { color: colors.text, fontWeight: '600' },
});
