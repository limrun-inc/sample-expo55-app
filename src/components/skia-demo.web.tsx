import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function SkiaDemo() {
  return (
    <ThemedView type="backgroundElement" style={styles.placeholder}>
      <ThemedText type="small" themeColor="textSecondary">
        Skia demo runs on iOS and Android
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
  },
});
