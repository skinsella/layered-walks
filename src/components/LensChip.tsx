import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, lensColor } from '@/theme/colors';
import { fonts } from '@/theme/typography';

/**
 * The signature gesture (docs/07 §5): a lens chip tinted with its museum-muted hue.
 * Inactive shows a hue dot; active fills with the hue. Lenses tint, never shout.
 */
export function LensChip({
  slug,
  label,
  icon,
  active = false,
  onPress,
}: {
  slug: string;
  label: string;
  icon?: string | null;
  active?: boolean;
  onPress?: () => void;
}) {
  const hue = lensColor(slug);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? hue : colors.border, backgroundColor: active ? hue : colors.surface },
      ]}
    >
      {!active && <View style={[styles.dot, { backgroundColor: hue }]} />}
      <Text style={[styles.label, { color: active ? '#FFFFFF' : colors.text }]}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontFamily: fonts.textMedium, fontSize: 14 },
});
