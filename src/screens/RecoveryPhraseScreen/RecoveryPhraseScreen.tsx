import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useWalletManager } from '@tetherto/wdk-react-native-core';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import {
  DEFAULT_WALLET_ID,
  MNEMONIC_WORD_COUNT,
} from '@features/wallet-seed-phrase';
import {
  ScreenContainer,
  PrimaryButton,
  AppIcon,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { SeedWordGrid } from '@widgets/seed-word-grid';

const BACKUP_STATUSES = [
  { label: 'Device', status: 'Encrypted' },
  { label: 'iCloud', status: 'Backed up' },
  { label: 'Backend', status: 'Synced' },
];

function splitMnemonic(mnemonic: string): string[] {
  return mnemonic.trim().split(/\s+/);
}

export function RecoveryPhraseScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore } = useStore();
  const { generateMnemonic, restoreWallet } = useWalletManager();

  const [words, setWords] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const mnemonic = await generateMnemonic(MNEMONIC_WORD_COUNT);
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

    setSaving(true);
    setSaveError('');
    try {
      await restoreWallet(words.join(' '), DEFAULT_WALLET_ID);
      setConfirmed(true);
      walletStore.syncSeedPhraseDisplay(words);
      navigation.reset({
        index: 0,
        routes: [{ name: 'BiometricUnlock' }],
      });
    } catch (err) {
      setSaveError((err instanceof Error && err.message) || 'Could not save wallet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
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
            <AppIcon name="copy-outline" size={16} color={colors.accentBright} />
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
          {saveError ? (
            <Text style={styles.persistError}>{saveError}</Text>
          ) : null}
          <PrimaryButton
            title={saving ? 'Saving wallet…' : "I've saved it — Continue"}
            onPress={handleConfirm}
            disabled={saving}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
