import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthContext';
import { colors } from '@/theme/colors';

export default function SignIn() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'in') await signInWithEmail(email.trim(), password);
      else await signUpWithEmail(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.brand}>Layered Walks</Text>
        <Text style={styles.tagline}>Walk a city through different lenses</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'in' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'in' ? 'up' : 'in')}>
          <Text style={styles.switch}>
            {mode === 'in'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>

        {/* TODO(sprint 1): Google + Apple buttons (Apple required by App Store). */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  brand: { color: colors.text, fontSize: 32, fontWeight: '700' },
  tagline: { color: colors.textMuted, fontSize: 16, marginBottom: 24 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  switch: { color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  error: { color: colors.danger },
});
