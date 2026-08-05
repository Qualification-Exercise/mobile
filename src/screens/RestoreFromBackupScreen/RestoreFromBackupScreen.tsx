import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import {
  downloadBackendBackup,
  BackupPassphrasePrompt,
  logBackupError,
  logBackupStart,
  logBackupStep,
  logBackupSuccess,
  toUserFacingBackupError,
} from '@features/wallet-backup';
import {
  isWalletAlreadyExistsError,
  useWallet,
} from '@features/wallet-seed-phrase';
import { requireWalletBiometry } from '@shared/lib';
import { useStore } from '@shared/store';
import {
  HeaderBackButton,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  colors,
  spacing,
} from '@shared/ui';

export function RestoreFromBackupScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { biometryStore } = useStore();
  const { restoreWallet, unlock, deleteWallet, getMnemonicFromEntropy } =
    useWallet();

  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [passphraseError, setPassphraseError] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canRestore =
    passphrase.length > 0 && confirmPassphrase.length > 0 && !restoring;

  async function handleRestore() {
    if (passphrase !== confirmPassphrase) {
      setPassphraseError('Passphrases do not match');
      return;
    }

    const verified = await requireWalletBiometry(
      biometryStore,
      'Restore from backup',
    );
    if (!verified) {
      return;
    }

    setRestoring(true);
    setPassphraseError('');
    setRestoreError('');

    try {
      logBackupStart('RestoreFromBackupScreen restore');
      const material = await downloadBackendBackup(passphrase);
      logBackupStep('decrypting entropy to mnemonic');
      const mnemonic = await getMnemonicFromEntropy(
        material.encryptedEntropy,
        material.encryptionKey,
      );
      logBackupSuccess('mnemonic derived from backup');

      await restoreWallet(mnemonic);
      logBackupSuccess('wallet restored on device');
      navigation.reset({
        index: 0,
        routes: [{ name: 'BiometricUnlock' }],
      });
    } catch (err) {
      logBackupError('restore from backup failed', err);
      const message = toUserFacingBackupError(err);
      setRestoreError(message);
    } finally {
      setRestoring(false);
    }
  }

  async function handleOpenExistingWallet() {
    const verified = await requireWalletBiometry(
      biometryStore,
      'Open saved wallet',
    );
    if (!verified) {
      return;
    }

    try {
      await unlock();
      navigation.reset({
        index: 0,
        routes: [{ name: 'BiometricUnlock' }],
      });
    } catch (err) {
      setRestoreError(
        (err instanceof Error && err.message) || 'Could not unlock wallet',
      );
    }
  }

  async function handleReplaceWallet() {
    const verified = await requireWalletBiometry(
      biometryStore,
      'Delete wallet',
    );
    if (!verified) {
      return;
    }

    setDeleting(true);
    try {
      await deleteWallet();
      setRestoreError('');
    } catch (err) {
      setRestoreError(
        (err instanceof Error && err.message) || 'Could not delete wallet',
      );
    } finally {
      setDeleting(false);
    }
  }

  const walletAlreadyExists =
    !!restoreError && isWalletAlreadyExistsError(restoreError);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Restore from backup</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>Backend backup</Text>
        <Text style={styles.description}>
          Enter the passphrase you chose when uploading your wallet backup to
          the server.
        </Text>
        <BackupPassphrasePrompt
          passphrase={passphrase}
          confirmPassphrase={confirmPassphrase}
          onPassphraseChange={setPassphrase}
          onConfirmPassphraseChange={setConfirmPassphrase}
          error={passphraseError}
        />
        {restoreError ? (
          <View style={styles.errorBlock}>
            <Text style={styles.restoreError}>
              {walletAlreadyExists
                ? 'A wallet is already saved on this device. Delete it first to restore from backup.'
                : restoreError}
            </Text>
            {walletAlreadyExists ? (
              <>
                <SecondaryButton
                  title="Open saved wallet"
                  onPress={handleOpenExistingWallet}
                />
                <SecondaryButton
                  title={
                    deleting ? 'Removing saved wallet…' : 'Delete saved wallet'
                  }
                  onPress={handleReplaceWallet}
                  disabled={deleting}
                />
              </>
            ) : null}
          </View>
        ) : null}
        <View style={styles.spacer} />
        <PrimaryButton
          title={restoring ? 'Restoring…' : 'Restore from backup'}
          onPress={handleRestore}
          disabled={!canRestore}
        />
      </View>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  errorBlock: {
    gap: spacing.sm,
  },
  restoreError: {
    fontSize: 12.5,
    color: '#E0715A',
    textAlign: 'center',
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
  },
});
