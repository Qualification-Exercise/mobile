import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, Clipboard, StyleSheet, Text, View } from 'react-native';
import { useStore } from '@shared/store';
import { requireWalletBiometry } from '@shared/lib';
import { isWalletAlreadyExistsError } from '@features/wallet-seed-phrase';
import {
  PrimaryButton,
  SecondaryButton,
  HeaderCloseButton,
  AppIcon,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { QrPlaceholder } from '@widgets/qr-placeholder';
import { SeedWordInputGrid } from '@widgets/seed-word-input-grid';
import { MOCK_SCANNED_PHRASE, parsePhraseInput } from './lib';

const EMPTY_PHRASE = Array(12).fill('');
const PHRASE_VALIDATION_DEBOUNCE_MS = 400;

type RestoreWalletProps = {
  onRestore: () => void;
};

export const RestoreWallet = observer(function RestoreWalletView({
  onRestore,
}: RestoreWalletProps) {
  const { walletStore, biometryStore, walletSeedPhraseStore } = useStore();
  const { restoreWalletRequest } = walletSeedPhraseStore;
  const [words, setWords] = useState<string[]>(EMPTY_PHRASE);
  const [isScanning, setIsScanning] = useState(false);

  const filledCount = words.filter(word => word.trim().length > 0).length;
  const isComplete = filledCount === 12;
  const isShapeValid = isComplete && walletSeedPhraseStore.isShapeValid(words);
  const isValid = isShapeValid && walletSeedPhraseStore.isWorkletValid === true;
  const isInvalid =
    isComplete &&
    (walletSeedPhraseStore.isWorkletValid === false ||
      (!walletSeedPhraseStore.isShapeValid(words) &&
        !walletSeedPhraseStore.isValidating));

  useEffect(() => {
    if (!isComplete) {
      walletSeedPhraseStore.resetValidation();
      return;
    }

    if (!walletSeedPhraseStore.isShapeValid(words)) {
      walletSeedPhraseStore.resetValidation();
      return;
    }

    walletSeedPhraseStore.resetValidation();

    const timeoutId = setTimeout(() => {
      void walletSeedPhraseStore.validateMnemonicPhrase(words);
    }, PHRASE_VALIDATION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [words, isComplete, walletSeedPhraseStore]);

  function handleChangeWord(index: number, value: string) {
    setWords(current => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  async function handlePaste() {
    const clipboardText = await Clipboard.getString();
    const parsed = parsePhraseInput(clipboardText);
    if (parsed) {
      setWords(parsed);
    }
  }

  function handleScanComplete() {
    const parsed = parsePhraseInput(MOCK_SCANNED_PHRASE.join(' '));
    if (parsed) {
      setWords(parsed);
    }
    setIsScanning(false);
  }

  async function handleRestore() {
    const verified = await requireWalletBiometry(
      biometryStore,
      'Restore wallet',
    );
    if (!verified) {
      return;
    }

    const result = await restoreWalletRequest.fetch(words);
    if (result.length === 12) {
      walletStore.syncSeedPhraseDisplay(result);
      onRestore();
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

    const opened = await walletSeedPhraseStore.openExistingWallet();
    if (opened) {
      onRestore();
    }
  }

  function handleReplaceWallet() {
    Alert.alert(
      'Replace saved wallet?',
      'This deletes the wallet on this device so you can import a different recovery phrase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete and continue',
          style: 'destructive',
          onPress: async () => {
            const verified = await requireWalletBiometry(
              biometryStore,
              'Delete wallet',
            );
            if (!verified) {
              return;
            }

            await walletSeedPhraseStore.deleteWalletRequest.fetch({
              emitDeletedSignal: false,
            });
            if (!walletSeedPhraseStore.deleteWalletRequest.error) {
              restoreWalletRequest.error = '';
              setWords(EMPTY_PHRASE);
              walletSeedPhraseStore.resetValidation();
            }
          },
        },
      ],
    );
  }

  const restoreError = restoreWalletRequest.error;
  const walletAlreadyExists =
    !!restoreError && isWalletAlreadyExistsError(restoreError);

  if (isScanning) {
    return (
      <View style={styles.scanContainer}>
        <View style={styles.scanHeader}>
          <HeaderCloseButton onPress={() => setIsScanning(false)} />
          <Text style={styles.scanTitle}>Scan recovery phrase</Text>
          <View style={styles.scanHeaderSpacer} />
        </View>
        <View style={styles.scanBody}>
          <Text style={styles.scanHint}>
            Point at your recovery phrase QR code
          </Text>
          <View style={styles.viewfinder}>
            <QrPlaceholder size={182} />
          </View>
        </View>
        <PrimaryButton title="Use this code" onPress={handleScanComplete} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter recovery phrase</Text>
      <Text style={styles.description}>
        Type your 12-word phrase in order to restore your wallet on this device.
      </Text>
      <View style={styles.actionsRow}>
        <PrimaryButton
          title="Paste"
          onPress={handlePaste}
          style={styles.actionButton}
        />
        <SecondaryButton
          title="Scan QR"
          onPress={() => setIsScanning(true)}
          style={styles.actionButton}
        />
      </View>
      <View style={styles.gridWrapper}>
        <SeedWordInputGrid words={words} onChangeWord={handleChangeWord} />
      </View>
      <View style={styles.statusRow}>
        {isComplete && isValid ? (
          <AppIcon name="checkmark-circle" size={14} color={colors.positive} />
        ) : null}
        <Text
          style={[
            styles.status,
            isComplete &&
              (isValid
                ? styles.statusValid
                : isInvalid
                ? styles.statusInvalid
                : undefined),
          ]}
        >
          {walletSeedPhraseStore.isValidating
            ? `Validating phrase · ${filledCount} / 12 words`
            : isComplete
            ? isValid
              ? `Valid BIP-39 phrase · ${filledCount} / 12 words`
              : isInvalid
              ? `Invalid phrase · ${filledCount} / 12 words`
              : `${filledCount} / 12 words`
            : `${filledCount} / 12 words`}
        </Text>
      </View>
      {restoreError ? (
        <View style={styles.errorBlock}>
          <Text style={styles.restoreError}>
            {walletAlreadyExists
              ? 'A wallet is already saved on this device. Restore is only for importing a wallet that is not here yet.'
              : restoreError}
          </Text>
          {walletAlreadyExists ? (
            <>
              <SecondaryButton
                title="Open saved wallet"
                onPress={handleOpenExistingWallet}
                style={styles.openExistingButton}
              />
              <SecondaryButton
                title={
                  walletSeedPhraseStore.deleteWalletRequest.loading
                    ? 'Removing saved wallet…'
                    : 'Replace with new phrase'
                }
                onPress={handleReplaceWallet}
                disabled={walletSeedPhraseStore.deleteWalletRequest.loading}
                style={styles.openExistingButton}
              />
            </>
          ) : null}
        </View>
      ) : null}
      <View style={styles.spacer} />
      <PrimaryButton
        title={restoreWalletRequest.loading ? 'Restoring…' : 'Restore wallet'}
        onPress={handleRestore}
        disabled={!isValid || restoreWalletRequest.loading}
      />
    </View>
  );
});

const styles = StyleSheet.create({
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
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
  gridWrapper: {
    marginTop: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  status: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  statusValid: {
    color: colors.positive,
  },
  statusInvalid: {
    color: '#E0715A',
  },
  restoreError: {
    fontSize: 12.5,
    color: '#E0715A',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBlock: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  openExistingButton: {
    marginTop: spacing.xs,
  },
  spacer: {
    flex: 1,
  },
  scanContainer: {
    flex: 1,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scanHeaderSpacer: {
    width: 22,
  },
  scanBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  scanHint: {
    color: colors.textPrimary,
    fontSize: 13.5,
    textAlign: 'center',
  },
  viewfinder: {
    borderWidth: 4,
    borderColor: colors.accentBright,
    borderRadius: radii.sm,
    padding: 12,
  },
});
