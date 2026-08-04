import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
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

export const RecoveryPhraseScreen = observer(function RecoveryPhraseScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore, walletSeedPhraseStore } = useStore();
  const { generateMnemonicRequest, persistWalletRequest, previewMnemonic } =
    walletSeedPhraseStore;
  const [persistAttempted, setPersistAttempted] = useState(false);
  const [confirmedWords, setConfirmedWords] = useState<string[] | null>(null);

  useEffect(() => {
    if (confirmedWords) {
      return;
    }
    if (walletSeedPhraseStore.api && !previewMnemonic.length) {
      generateMnemonicRequest.fetch();
    }
  }, [
    confirmedWords,
    walletSeedPhraseStore.api,
    previewMnemonic.length,
    generateMnemonicRequest,
  ]);

  const words =
    confirmedWords ??
    (previewMnemonic.length > 0
      ? previewMnemonic
      : generateMnemonicRequest.data);

  async function handleConfirm() {
    setPersistAttempted(true);
    const result = await persistWalletRequest.fetch();
    if (result.length === 12) {
      setConfirmedWords(result);
      walletStore.syncSeedPhraseDisplay(result);
      navigation.reset({
        index: 0,
        routes: [{ name: 'BiometricUnlock' }],
      });
      walletSeedPhraseStore.clearPreviewMnemonic();
    }
  }

  return (
    <ScreenContainer>
      {!walletSeedPhraseStore.api || generateMnemonicRequest.loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accentBright} />
          <Text style={styles.loadingText}>Generating recovery phrase…</Text>
        </View>
      ) : generateMnemonicRequest.error || words.length !== 12 ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Could not generate phrase</Text>
          <Text style={styles.errorMessage}>
            {generateMnemonicRequest.error ||
              'Something went wrong. Please try again.'}
          </Text>
          <PrimaryButton
            title="Retry"
            onPress={() => generateMnemonicRequest.fetch()}
          />
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
          {persistAttempted && persistWalletRequest.error ? (
            <Text style={styles.persistError}>
              {persistWalletRequest.error}
            </Text>
          ) : null}
          <PrimaryButton
            title={
              persistWalletRequest.loading
                ? 'Saving wallet…'
                : "I've saved it — Continue"
            }
            onPress={handleConfirm}
            disabled={persistWalletRequest.loading}
          />
        </View>
      )}
    </ScreenContainer>
  );
});

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
