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

const BACKUP_STATUSES = [
  { label: 'Device', status: 'Ready' },
  { label: 'Backend', status: 'On continue' },
  { label: 'Google Drive', status: 'On continue' },
];

function splitMnemonic(mnemonic: string): string[] {
  return mnemonic.trim().split(/\s+/);
}

export const CreateWalletScreen = observer(function CreateWalletScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletBackupStore } = useStore();
  const {
    generateMnemonic,
    restoreWallet,
    getEncryptionKey,
    getEncryptedSeed,
    getEncryptedEntropy,
  } = useWallet();

  const [words, setWords] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const saving = walletBackupStore.busy;

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

  async function handleConfirm() {
    if (words.length !== MNEMONIC_WORD_COUNT) {
      return;
    }

    const mnemonic = words.join(' ');

    const succeeded = await walletBackupStore.createAndBackupWallet(mnemonic, {
      restoreWallet,
      getEncryptionKey,
      getEncryptedSeed,
      getEncryptedEntropy,
    });

    if (!succeeded) {
      if (walletBackupStore.error?.code === 'remote_wallet_exists') {
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
      }
      return;
    }

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
          <View style={styles.statusRow}>
            {BACKUP_STATUSES.map(({ label, status }) => (
              <View key={label} style={styles.statusCard}>
                <Text style={styles.statusLabel}>{label}</Text>
                <View style={styles.statusValueRow}>
                  <Text style={styles.statusValue}>{status}</Text>
                  <AppIcon
                    name="checkmark-circle"
                    size={12}
                    color={colors.accentBright}
                  />
                </View>
              </View>
            ))}
          </View>
          {walletBackupStore.creationMessage &&
          walletBackupStore.error?.code !== 'remote_wallet_exists' ? (
            <Text style={styles.persistError}>
              {walletBackupStore.creationMessage}
            </Text>
          ) : null}
          <PrimaryButton
            title={
              saving
                ? 'Saving wallet…'
                : walletBackupStore.error
                ? 'Retry backup'
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
    borderRadius: radii.sm,
    padding: 11,
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
