import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuth } from '@/features/auth/AuthContext';
import { colors } from '@/theme/colors';
import { fonts, typeScale } from '@/theme/typography';

export default function Profile() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.body}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{session?.user.email ?? '—'}</Text>

        {/* TODO(sprint 1): theme preferences, default duration/intensity. */}

        {/* Creator entry → Record mode. Full onboarding (Stripe Connect) is Sprint 6;
            this opens the field Record screen on a draft tour. */}
        <Pressable
          style={styles.creatorBtn}
          onPress={() => router.push({ pathname: '/record/[tourId]', params: { tourId: 'new' } })}
        >
          <Text style={styles.creatorTitle}>Record a tour</Text>
          <Text style={styles.creatorSub}>Walk your route, narrate each stop in place →</Text>
        </Pressable>

        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 24, gap: 6 },
  label: { ...typeScale.section, color: colors.textMuted },
  email: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 24 },
  creatorBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  creatorTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  creatorSub: { fontFamily: fonts.text, fontSize: 13, color: colors.textMuted },
  signOut: {
    marginTop: 'auto',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  signOutText: { fontFamily: fonts.textSemibold, color: colors.danger },
});
