import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useWallet } from '@features/wallet-seed-phrase';
import {
  PressableButton,
  ScreenContainer,
  SecondaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';

export function WalletSetupScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { hasPersistedWallet } = useWallet();
  const redirectedRef = useRef(false);
  const persistedWalletExists = hasPersistedWallet();

  useEffect(() => {
    if (!persistedWalletExists || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    navigation.reset({
      index: 0,
      routes: [{ name: 'BiometricUnlock' }],
    });
  }, [persistedWalletExists, navigation]);

  if (persistedWalletExists) {
    return null;
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Text style={styles.markGlyph}>W</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.title}>Set up your wallet</Text>
            <Text style={styles.tagline}>
              Create a new wallet or restore one with your 12-word recovery
              phrase.
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <PressableButton
            title="Create new wallet"
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'CreateWallet' }],
              })
            }
          />
          <SecondaryButton
            title="Restore with recovery phrase"
            onPress={() => navigation.navigate('RestoreWallet')}
          />
          <Text style={styles.footer}>
            Your recovery phrase is the only way to recover this wallet.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  mark: {
    width: 84,
    height: 84,
    borderRadius: radii.xxl,
    backgroundColor: colors.accentBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGlyph: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.background,
  },
  heroText: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tagline: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    gap: spacing.md,
  },
  footer: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
