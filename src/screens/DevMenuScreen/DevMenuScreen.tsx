import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import {
  HeaderBackButton,
  ScreenContainer,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { ErrorsPlayground } from '@features/dev-tools';

type DevMenuView = 'menu' | 'errors-playground';

/**
 * Dev-only Developer Menu screen, reached from the React Native Dev Menu item.
 * Registered in `RootNavigator` behind `__DEV__` and mounted as a normal stack
 * screen, so it participates in the app's navigation flow like any other.
 *
 * It exposes a single item, "Errors playground", from which a developer can
 * raise every error kind the app is expected to catch. The playground is shown
 * as an in-screen sub-view; the back button steps back to the menu first, then
 * out of the screen.
 */
export function DevMenuScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [view, setView] = useState<DevMenuView>('menu');

  const handleBack = () => {
    if (view === 'errors-playground') {
      setView('menu');
      return;
    }
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={handleBack} />
        <Text style={styles.title}>
          {view === 'menu' ? 'Developer Menu' : 'Errors Playground'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {view === 'menu' ? (
        <Pressable
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          onPress={() => setView('errors-playground')}
        >
          <Text style={styles.itemTitle}>Errors playground</Text>
          <Text style={styles.itemChevron}>›</Text>
        </Pressable>
      ) : (
        <ErrorsPlayground />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  itemPressed: {
    opacity: 0.75,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  itemChevron: {
    color: colors.textTertiary,
    fontSize: 22,
    fontWeight: '400',
  },
});
