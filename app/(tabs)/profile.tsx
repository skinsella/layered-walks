import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthContext';
import { colors } from '@/theme/colors';

export default function Profile() {
  const { session, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.body}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{session?.user.email ?? '—'}</Text>

        {/* TODO(sprint 1): theme preferences, default duration/intensity. */}
        {/* TODO(sprint 6): "Become a creator" → Stripe Connect onboarding. */}

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
  label: { color: colors.textMuted },
  email: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 24 },
  signOut: {
    marginTop: 'auto',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  signOutText: { color: colors.danger, fontWeight: '600' },
});
