import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { observer } from 'mobx-react-lite';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import { getWalletBackupErrorMessage, toWalletBackupError } from '@shared/lib';
import { MNEMONIC_WORD_COUNT, useWallet } from '@shared/lib/hooks/wallet';
import {
  ScreenContainer,
  PrimaryButton,
  AppIcon,
  HeaderBackButton,
  colors,
  radii,
  spacing,
  SeedWordGrid,
} from '@shared/ui';

const BACKUP_OPTIONS = [
  { id: 'local', label: 'This device' },
  { id: 'cloud', label: 'Google Drive' },
] as const;

type BackupOption = (typeof BACKUP_OPTIONS)[number]['id'];

function splitMnemonic(mnemonic: string): string[] {
  return mnemonic.trim().split(/\s+/);
}

export const CreateWalletScreen = observer(function CreateWalletScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { secretsStore, walletBackupStore } = useStore();
  const { generateMnemonic, restoreWallet, getWalletCredentials } = useWallet();

  const [words, setWords] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [walletCreatedForPendingBackup, setWalletCreatedForPendingBackup] =
    useState(false);
  const [selectedBackups, setSelectedBackups] = useState<
    Record<BackupOption, boolean>
  >({ local: false, cloud: false });
  const [creationMessage, setCreationMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const saving = walletBackupStore.status === 'loading' || creating;

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
      generate().catch(() => undefined);
    }
  }, [confirmed, words.length, generating, generateError, generate]);

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

  function toggleBackup(option: BackupOption) {
    setSelectedBackups(current => ({
      ...current,
      [option]: !current[option],
    }));
  }

  async function handleConfirm() {
    if (words.length !== MNEMONIC_WORD_COUNT) {
      setCreationMessage('Could not create wallet. Please try again.');
      return;
    }

    setCreationMessage('');
    setCreating(true);
    let walletCreated = walletCreatedForPendingBackup;

    try {
      if (!walletCreatedForPendingBackup) {
        if (await secretsStore.hasRemoteWallet()) {
          Alert.alert(
            'Wallet already exists',
            'You already have a wallet on this account. Use Google Drive ' +
              'recovery, this device’s recovery key, or your recovery phrase.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Restore options',
                onPress: () => navigation.goBack(),
              },
            ],
          );
          return;
        }

        await restoreWallet(words.join(' '));
        walletCreated = true;
        setWalletCreatedForPendingBackup(true);
      }

      if (selectedBackups.local || selectedBackups.cloud) {
        const credentials = await getWalletCredentials();
        if (
          selectedBackups.local &&
          !(await walletBackupStore.saveLocalBackup(credentials))
        ) {
          const error = walletBackupStore.error;
          setCreationMessage(
            error
              ? getWalletBackupErrorMessage(error)
              : 'Wallet created, device recovery backup incomplete.',
          );
          return;
        }
        if (
          selectedBackups.cloud &&
          !(await walletBackupStore.backupToCloud(credentials))
        ) {
          const error = walletBackupStore.error;
          setCreationMessage(
            error
              ? getWalletBackupErrorMessage(error)
              : 'Wallet created, Google Drive backup incomplete.',
          );
          return;
        }
      }
    } catch (error) {
      setCreationMessage(
        walletCreated
          ? getWalletBackupErrorMessage(toWalletBackupError(error))
          : 'Could not create wallet. Please try again.',
      );
      return;
    } finally {
      setCreating(false);
    }

    setWalletCreatedForPendingBackup(false);
    setConfirmed(true);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }

  return (
    <ScreenContainer>
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
        <View style={styles.container}>
          <Text style={styles.title}>Your recovery phrase</Text>
          <Text style={styles.description}>
            Write these 12 words down in order. This is the only way to recover
            your wallet.
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
          <View style={styles.spacer} />
          <Text style={styles.backupHint}>
            Optional recovery backups — choose what to create.
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusCard, styles.statusCardSelected]}>
              <Text style={styles.statusLabel}>Wallet</Text>
              <View style={styles.statusValueRow}>
                <Text style={styles.statusValue}>Device</Text>
                <AppIcon
                  name="checkmark-circle"
                  size={12}
                  color={colors.accentBright}
                />
              </View>
            </View>
            {BACKUP_OPTIONS.map(({ id, label }) => {
              const selected = selectedBackups[id];
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.statusCard,
                    selected && styles.statusCardSelected,
                  ]}
                  onPress={() => toggleBackup(id)}
                  disabled={saving}
                  activeOpacity={0.75}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={styles.statusLabel}>{label}</Text>
                  <View style={styles.statusValueRow}>
                    <Text style={styles.statusValue}>
                      {selected ? 'Selected' : 'Optional'}
                    </Text>
                    <AppIcon
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                      color={
                        selected ? colors.accentBright : colors.textSecondary
                      }
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {creationMessage ? (
            <Text style={styles.persistError}>{creationMessage}</Text>
          ) : null}
          <PrimaryButton
            title={
              saving
                ? 'Saving wallet…'
                : walletCreatedForPendingBackup
                ? 'Retry selected backups'
                : "I've saved it — Continue"
            }
            onPress={handleConfirm}
            disabled={saving}
          />
        </View>
      )}
    </ScreenContainer>
  );
});

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
  spacer: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusCard: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radii.sm,
    padding: 11,
  },
  statusCardSelected: {
    borderColor: colors.accent,
  },
  backupHint: {
    color: colors.textSecondary,
    fontSize: 11.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusValue: {
    fontSize: 10,
    color: colors.accentBright,
  },
  statusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  persistError: {
    color: '#E0715A',
    fontSize: 12.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
});
