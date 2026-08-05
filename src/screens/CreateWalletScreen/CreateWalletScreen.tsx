import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import type { RootStackNavigationProp } from '@app/navigation/types';
import {
  BackupOptionToggles,
  BackupPassphraseSheet,
  BACKUP_ADDRESS_NETWORKS,
  uploadBackendBackup,
  validatePassphrase,
  logBackupError,
  logBackupStart,
  logBackupStep,
  logBackupSuccess,
  summarizeAddressResults,
  toUserFacingBackupError,
  type BackupOptionState,
} from '@features/wallet-backup';
import { MNEMONIC_WORD_COUNT, useWallet } from '@features/wallet-seed-phrase';
import { getBackendConfig } from '@shared/api';
import {
  ScreenContainer,
  PrimaryButton,
  AppIcon,
  HeaderBackButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { SeedWordGrid } from '@widgets/seed-word-grid';

const INITIAL_DEVICE_STATE: BackupOptionState = {
  enabled: true,
  status: 'idle',
};

const INITIAL_ICLOUD_STATE: BackupOptionState = {
  enabled: false,
  status: 'idle',
};

const INITIAL_BACKEND_STATE: BackupOptionState = {
  enabled: false,
  status: 'idle',
};

function splitMnemonic(mnemonic: string): string[] {
  return mnemonic.trim().split(/\s+/);
}

export function CreateWalletScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const {
    generateMnemonic,
    restoreWallet,
    getEncryptionKey,
    getEncryptedEntropy,
    getEncryptedSeed,
    loadAddresses,
  } = useWallet();

  const [words, setWords] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [backendEnabled, setBackendEnabled] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [passphraseError, setPassphraseError] = useState('');
  const [passphraseSheetVisible, setPassphraseSheetVisible] = useState(false);
  const [deviceBackup, setDeviceBackup] =
    useState<BackupOptionState>(INITIAL_DEVICE_STATE);
  // TODO: remove this once we have a working iCloud backup
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [icloudBackup, setIcloudBackup] =
    useState<BackupOptionState>(INITIAL_ICLOUD_STATE);
  const [backendBackup, setBackendBackup] = useState<BackupOptionState>(
    INITIAL_BACKEND_STATE,
  );

  const generate = useCallback(async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const mnemonic = await generateMnemonic();
      setWords(splitMnemonic(mnemonic));
    } catch (err) {
      setGenerateError(
        (err instanceof Error && err.message) ||
          'Could not generate recovery phrase',
      );
    } finally {
      setGenerating(false);
    }
  }, [generateMnemonic]);

  useEffect(() => {
    if (!confirmed && words.length === 0 && !generating && !generateError) {
      void generate();
    }
  }, [confirmed, words.length, generating, generateError, generate]);

  useEffect(() => {
    setBackendBackup(current => ({
      ...current,
      enabled: backendEnabled,
      status: backendEnabled ? current.status : 'idle',
      error: backendEnabled ? current.error : undefined,
    }));
  }, [backendEnabled]);

  const backendPassphraseReady =
    passphrase.length > 0 && passphrase === confirmPassphrase;

  function handleBackendEnabledChange(enabled: boolean) {
    setBackendEnabled(enabled);
    setPassphraseError('');
    if (enabled) {
      setPassphraseSheetVisible(true);
      return;
    }
    setPassphraseSheetVisible(false);
    setPassphrase('');
    setConfirmPassphrase('');
  }

  function handlePassphraseSave(nextPassphrase: string, nextConfirm: string) {
    setPassphrase(nextPassphrase);
    setConfirmPassphrase(nextConfirm);
    setPassphraseError('');
    setPassphraseSheetVisible(false);
  }

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(words.join(' '));
      Toast.show({
        type: 'success',
        text1: 'Copied',
        text2: 'Recovery phrase copied to clipboard',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Copy failed',
        text2: 'Could not copy recovery phrase',
      });
    }
  }

  async function handleConfirm() {
    if (words.length !== MNEMONIC_WORD_COUNT) {
      return;
    }

    if (backendEnabled && !backendPassphraseReady) {
      setPassphraseError('Set a backup passphrase before continuing');
      setPassphraseSheetVisible(true);
      return;
    }

    setSaving(true);
    setSaveError('');
    setPassphraseError('');
    setDeviceBackup({ enabled: true, status: 'in_progress' });
    setBackendBackup(current => ({
      ...current,
      enabled: backendEnabled,
      status: backendEnabled ? 'pending' : 'idle',
      error: undefined,
    }));

    let deviceSaved = false;

    try {
      if (backendEnabled) {
        logBackupStart('CreateWalletScreen confirm');
        const config = await getBackendConfig();
        logBackupSuccess('prefetch config for passphrase rules');
        const validation = validatePassphrase(
          passphrase,
          confirmPassphrase,
          config.secretsKdfFloor,
        );
        if (!validation.valid) {
          logBackupStep('blocked before device save', {
            reason: validation.message,
          });
          setPassphraseError(validation.message);
          setPassphraseSheetVisible(true);
          setDeviceBackup({ enabled: true, status: 'idle' });
          setBackendBackup({
            enabled: true,
            status: 'failed',
            error: validation.message,
          });
          return;
        }
      }

      await restoreWallet(words.join(' '));
      deviceSaved = true;
      setDeviceBackup({ enabled: true, status: 'completed' });
      logBackupSuccess('device wallet saved to keychain');

      if (backendEnabled) {
        setBackendBackup({ enabled: true, status: 'in_progress' });
        logBackupStep('loading credentials and addresses', {
          networks: BACKUP_ADDRESS_NETWORKS,
        });

        const [encryptionKey, encryptedEntropy, encryptedSeed, addresses] =
          await Promise.all([
            getEncryptionKey(),
            getEncryptedEntropy(),
            getEncryptedSeed(),
            loadAddresses([0], BACKUP_ADDRESS_NETWORKS),
          ]);

        logBackupStep('credentials and addresses loaded', {
          hasEncryptionKey: Boolean(encryptionKey),
          hasEncryptedEntropy: Boolean(encryptedEntropy),
          hasEncryptedSeed: Boolean(encryptedSeed),
          addresses: summarizeAddressResults(addresses),
        });

        if (!encryptionKey || !encryptedEntropy || !encryptedSeed) {
          throw new Error('Wallet credentials are unavailable after save');
        }

        await uploadBackendBackup({
          passphrase,
          confirmPassphrase,
          material: {
            encryptionKey,
            encryptedEntropy,
            encryptedSeed,
            wordCount: MNEMONIC_WORD_COUNT,
          },
          addresses,
        });

        setBackendBackup({ enabled: true, status: 'completed' });
      }

      setConfirmed(true);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (err) {
      const message =
        (err instanceof Error && err.message) || 'Could not save wallet';

      if (!deviceSaved) {
        logBackupError('wallet save failed (device)', err);
        setDeviceBackup({ enabled: true, status: 'failed', error: message });
        setSaveError(message);
      } else if (backendEnabled) {
        logBackupError('backend backup failed after device save', err);
        const userMessage = toUserFacingBackupError(err);
        setBackendBackup({
          enabled: true,
          status: 'failed',
          error: userMessage,
        });
        Toast.show({
          type: 'error',
          text1: 'Backend backup failed',
          text2: userMessage,
        });
        setConfirmed(true);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        setSaveError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Create wallet</Text>
        <View style={styles.headerSpacer} />
      </View>
      {generating ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accentBright} />
          <Text style={styles.loadingText}>Generating recovery phrase…</Text>
        </View>
      ) : generateError || words.length !== MNEMONIC_WORD_COUNT ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Could not generate phrase</Text>
          <Text style={styles.errorMessage}>
            {generateError || 'Something went wrong. Please try again.'}
          </Text>
          <PrimaryButton title="Retry" onPress={() => generate()} />
        </View>
      ) : (
        <View style={styles.body}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Your recovery phrase</Text>
            <Text style={styles.description}>
              Write these 12 words down in order. This is the only way to
              recover your wallet.
            </Text>
            <View style={styles.gridWrapper}>
              <SeedWordGrid words={words} />
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopy}
              activeOpacity={0.7}
            >
              <AppIcon
                name="copy-outline"
                size={16}
                color={colors.accentBright}
              />
              <Text style={styles.copyButtonText}>Copy to clipboard</Text>
            </TouchableOpacity>
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                Never share your phrase. WDK cannot recover it for you.
              </Text>
            </View>
            <View style={styles.backupSection}>
              <BackupOptionToggles
                device={deviceBackup}
                icloud={icloudBackup}
                backend={backendBackup}
                backendEnabled={backendEnabled}
                backendPassphraseReady={backendPassphraseReady}
                onBackendEnabledChange={handleBackendEnabledChange}
                onBackendConfigure={() => setPassphraseSheetVisible(true)}
              />
            </View>
          </ScrollView>
          <View style={styles.footer}>
            {saveError ? (
              <Text style={styles.persistError}>{saveError}</Text>
            ) : null}
            <PrimaryButton
              title={
                saving
                  ? backendEnabled
                    ? 'Saving wallet and backup…'
                    : 'Saving wallet…'
                  : "I've saved it — Continue"
              }
              onPress={handleConfirm}
              disabled={saving}
            />
          </View>
        </View>
      )}
      <BackupPassphraseSheet
        visible={passphraseSheetVisible}
        initialPassphrase={passphrase}
        initialConfirmPassphrase={confirmPassphrase}
        error={passphraseError}
        onClose={() => setPassphraseSheetVisible(false)}
        onSave={handlePassphraseSave}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  footer: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  errorMessage: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
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
  },
  gridWrapper: {
    marginTop: spacing.xl,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.sm,
  },
  copyButtonText: {
    color: colors.accentBright,
    fontSize: 14,
    fontWeight: '600',
  },
  warning: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(45,190,140,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(45,190,140,0.2)',
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  warningText: {
    color: colors.positive,
    fontSize: 12.5,
    lineHeight: 18,
  },
  backupSection: {
    marginTop: spacing.xl,
  },
  persistError: {
    color: '#E0715A',
    fontSize: 12.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
});
