import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { RootStackNavigationProp } from '@app/navigation/types';
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
import { getLocalBackupRestoreErrorMessage } from './localBackupRestoreError';

export const WalletSetupScreen = observer(function WalletSetupScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletBackupStore } = useStore();
  const { unlock } = useWallet();
  const restoring = !['idle', 'failed', 'complete'].includes(
    walletBackupStore.restorePhase,
  );

  useFocusEffect(
    useCallback(() => {
      walletBackupStore.checkRemoteBackupPresence();
    }, [walletBackupStore]),
  );

  async function handleLocalBackupRestore() {
    walletBackupStore.resetRestoreState();
    const succeeded = await walletBackupStore.restoreFromLocalBackup({
      unlock,
    });
    if (succeeded) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      return;
    }

    const error = walletBackupStore.restoreError;
    if (error) {
      Alert.alert(
        'Could not restore wallet',
        getLocalBackupRestoreErrorMessage(
          error,
          walletBackupStore.restoreBackupIssue,
          walletBackupStore.restoreDiagnostics,
        ),
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
          {walletBackupStore.remoteBackupPresence === 'absent' ? (
            <PressableButton
              title="Create new wallet"
              onPress={() => navigation.navigate('CreateWallet')}
              disabled={restoring}
            />
          ) : walletBackupStore.remoteBackupPresence === 'error' ? (
            <SecondaryButton
              title="Retry wallet backup check"
              onPress={walletBackupStore.checkRemoteBackupPresence}
              disabled={restoring}
            />
          ) : walletBackupStore.remoteBackupPresence === 'checking' ||
            walletBackupStore.remoteBackupPresence === 'unknown' ? (
            <Text style={styles.backupCheckText}>
              Checking wallet backup status…
            </Text>
          ) : null}
          <SecondaryButton
            title="Restore with recovery phrase"
            onPress={() => navigation.navigate('RestoreWallet')}
            disabled={restoring}
          />
          <SecondaryButton
            title={
              restoring
                ? 'Restoring backup…'
                : 'Restore from backup on this device'
            }
            onPress={handleLocalBackupRestore}
            disabled={restoring}
          />
          <Text style={styles.footer}>
            Your recovery phrase is the only way to recover this wallet.
          </Text>
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
    gap: spacing.md,
  },
  backupCheckText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
  },
  footer: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
