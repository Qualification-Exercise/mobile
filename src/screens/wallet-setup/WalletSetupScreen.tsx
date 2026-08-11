import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { getWalletBackupErrorMessage } from '@shared/lib';
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
  const { walletBackupStore } = useStore();
  const { unlock } = useWallet();
  const [checkingRecoveryOptions, setCheckingRecoveryOptions] = useState(true);
  const actionRunning = walletBackupStore.busy;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setCheckingRecoveryOptions(true);
      Promise.all([
        walletBackupStore.checkBackendWalletPresence(),
        walletBackupStore.checkLocalRecoveryKeyPresence(),
        walletBackupStore.checkCloudRecoveryKeyPresence(),
      ]).finally(() => {
        if (active) {
          setCheckingRecoveryOptions(false);
        }
      });

      return () => {
        active = false;
      };
    }, [walletBackupStore]),
  );

  async function handleLocalBackupRestore() {
    const succeeded = await walletBackupStore.restoreFromLocalBackup({
      unlock,
    });
    if (succeeded) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      return;
    }

    const error = walletBackupStore.error;
    if (error) {
      Alert.alert(
        'Could not restore wallet',
        getWalletBackupErrorMessage(error),
      );
    }
  }

  async function handleCloudBackupRestore() {
    const succeeded = await walletBackupStore.restoreFromCloudBackup({
      unlock,
    });
    if (succeeded) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      return;
    }

    const error = walletBackupStore.error;
    if (error) {
      Alert.alert(
        'Could not restore wallet',
        getWalletBackupErrorMessage(error),
      );
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
              {walletBackupStore.backendWallet.available === false ? (
                <PressableButton
                  title="Create new wallet"
                  onPress={() => navigation.navigate('CreateWallet')}
                  disabled={actionRunning}
                />
              ) : walletBackupStore.backendWallet.error ? (
                <SecondaryButton
                  title="Retry wallet backup check"
                  onPress={walletBackupStore.checkBackendWalletPresence}
                  disabled={actionRunning}
                />
              ) : walletBackupStore.backendWallet.loading ||
                walletBackupStore.backendWallet.available == null ? (
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
                  title="Restore from backup on this device"
                  onPress={handleLocalBackupRestore}
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
