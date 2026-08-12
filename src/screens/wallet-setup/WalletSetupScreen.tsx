import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { getWalletBackupErrorMessage, toWalletBackupError } from '@shared/lib';
import { useWallet } from '@shared/lib/hooks/wallet';
import { useStore } from '@shared/store';
import {
  PressableButton,
  ScreenContainer,
  SecondaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';

export const WalletSetupScreen = observer(function WalletSetupScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { biometryStore, walletBackupStore } = useStore();
  const { restoreWalletCredentials } = useWallet();
  const [restoring, setRestoring] = useState(false);
  const actionRunning = walletBackupStore.status === 'loading' || restoring;
  const checkingRecoveryOptions =
    actionRunning && walletBackupStore.backendWalletAvailable == null;

  useFocusEffect(
    useCallback(() => {
      walletBackupStore.checkRecoveryOptions();
    }, [walletBackupStore]),
  );

  function handleStartFromZero() {
    Alert.alert(
      'Start from zero?',
      'This creates a brand-new wallet. The wallet already backed up on this ' +
        'account stays put, and you can only recover the new one with its ' +
        'recovery phrase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create new wallet',
          style: 'destructive',
          onPress: () =>
            navigation.navigate('CreateWallet', {
              discardExistingWallet: true,
            }),
        },
      ],
    );
  }

  async function handleLocalBackupRestore() {
    const outcome = await biometryStore.verify('Restore wallet backup');
    if (outcome !== 'unlocked') {
      return;
    }
    setRestoring(true);
    try {
      const credentials = await walletBackupStore.loadBackupCredentials(
        'local',
      );
      if (credentials == null) {
        const error = walletBackupStore.error;
        if (error) {
          Alert.alert(
            'Could not restore wallet',
            getWalletBackupErrorMessage(error),
          );
        }
        return;
      }
      await restoreWalletCredentials(credentials);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      Alert.alert(
        'Could not restore wallet',
        getWalletBackupErrorMessage(toWalletBackupError(error)),
      );
    } finally {
      setRestoring(false);
    }
  }

  async function handleCloudBackupRestore() {
    const outcome = await biometryStore.verify(
      'Restore wallet from Google Drive',
    );
    if (outcome !== 'unlocked') {
      return;
    }
    setRestoring(true);
    try {
      const credentials = await walletBackupStore.loadBackupCredentials(
        'cloud',
      );
      if (credentials == null) {
        const error = walletBackupStore.error;
        if (error) {
          Alert.alert(
            'Could not restore wallet',
            getWalletBackupErrorMessage(error),
          );
        }
        return;
      }
      await restoreWalletCredentials(credentials);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      Alert.alert(
        'Could not restore wallet',
        getWalletBackupErrorMessage(toWalletBackupError(error)),
      );
    } finally {
      setRestoring(false);
    }
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
          {checkingRecoveryOptions ? (
            <View style={styles.optionsLoader}>
              <ActivityIndicator
                size="large"
                color={colors.accentBright}
                accessibilityLabel="Checking recovery options"
              />
            </View>
          ) : (
            <>
              {walletBackupStore.backendWalletAvailable === false ? (
                <PressableButton
                  title="Create new wallet"
                  onPress={() => navigation.navigate('CreateWallet')}
                  disabled={actionRunning}
                />
              ) : walletBackupStore.status === 'error' ? (
                <SecondaryButton
                  title="Retry wallet backup check"
                  onPress={() => walletBackupStore.checkRecoveryOptions()}
                  disabled={actionRunning}
                />
              ) : walletBackupStore.backendWalletAvailable == null ? (
                <ActivityIndicator
                  size="small"
                  color={colors.accentBright}
                  accessibilityLabel="Checking wallet backup"
                />
              ) : null}
              <SecondaryButton
                title="Restore with recovery phrase"
                onPress={() => navigation.navigate('RestoreWallet')}
                disabled={actionRunning}
              />
              {walletBackupStore.cloudRecoveryKeyAvailable ? (
                <SecondaryButton
                  title="Restore from Google Drive"
                  onPress={handleCloudBackupRestore}
                  disabled={actionRunning}
                />
              ) : null}
              {walletBackupStore.localRecoveryKeyAvailable ? (
                <SecondaryButton
                  title="Restore with device recovery key"
                  onPress={handleLocalBackupRestore}
                  disabled={actionRunning}
                />
              ) : null}
              {walletBackupStore.backendWalletAvailable ? (
                <SecondaryButton
                  title="Create a new wallet"
                  onPress={handleStartFromZero}
                  disabled={actionRunning}
                />
              ) : null}
              <Text style={styles.footer}>
                Choose an available recovery method or use your recovery phrase.
              </Text>
            </>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
});

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
    minHeight: 286,
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  optionsLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
