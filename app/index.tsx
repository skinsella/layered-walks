import { Redirect } from 'expo-router';

// Entry point — the auth gate in _layout handles the real routing once the
// session resolves. Default landing is the tab group.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
