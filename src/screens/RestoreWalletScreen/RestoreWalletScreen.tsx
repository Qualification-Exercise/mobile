import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert, Clipboard, StyleSheet, Text, View } from 'react-native';
import { validateMnemonic } from '@tetherto/wdk-react-native-core';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import { requireWalletBiometry } from '@shared/lib';
import {
  isWalletAlreadyExistsError,
  useWallet,
} from '@features/wallet-seed-phrase';
import {
  AppIcon,
  HeaderBackButton,
  HeaderCloseButton,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { QrPlaceholder } from '@widgets/qr-placeholder';
import { SeedWordInputGrid } from '@widgets/seed-word-input-grid';

const MOCK_SCANNED_PHRASE = [
  'ridge',
  'salmon',
  'velvet',
  'orbit',
  'cluster',
  'amber',
  'pigeon',
  'trophy',
  'decade',
  'fabric',
  'wisdom',
  'glance',
];

function parsePhraseInput(text: string): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length === 12 ? words : null;
}

const EMPTY_PHRASE = Array(12).fill('');
const PHRASE_VALIDATION_DEBOUNCE_MS = 400;

function isShapeValid(words: string[]): boolean {
  return validateMnemonic(words.join(' ').trim());
}

export function RestoreWalletScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { biometryStore } = useStore();
  const { restoreWallet, unlock, deleteWallet, getSeedAndEntropyFromMnemonic } =
    useWallet();
  const [words, setWords] = useState<string[]>(EMPTY_PHRASE);
  const [isScanning, setIsScanning] = useState(false);

  // Async worklet validation state for the entered phrase.
  const [isValidating, setIsValidating] = useState(false);
  const [isWorkletValid, setIsWorkletValid] = useState<boolean | null>(null);
  const validationSeq = useRef(0);

  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const filledCount = words.filter(word => word.trim().length > 0).length;
  const isComplete = filledCount === 12;
  const shapeValid = isComplete && isShapeValid(words);
  const isValid = shapeValid && isWorkletValid === true;
  const isInvalid =
    isComplete && (isWorkletValid === false || (!shapeValid && !isValidating));

  const resetValidation = useCallback(() => {
    validationSeq.current += 1;
    setIsWorkletValid(null);
    setIsValidating(false);
  }, []);

  const validatePhrase = useCallback(
    async (candidate: string[]) => {
      const mnemonic = candidate.join(' ').trim();
      const seq = ++validationSeq.current;

      setIsValidating(true);
      setIsWorkletValid(null);

      try {
        await getSeedAndEntropyFromMnemonic(mnemonic);
        if (seq === validationSeq.current) {
          setIsWorkletValid(true);
        }
      } catch {
        if (seq === validationSeq.current) {
          setIsWorkletValid(false);
        }
      } finally {
        if (seq === validationSeq.current) {
          setIsValidating(false);
        }
      }
    },
    [getSeedAndEntropyFromMnemonic],
  );

  useEffect(() => {
    if (!isComplete || !isShapeValid(words)) {
      resetValidation();
      return;
    }

    resetValidation();

    const timeoutId = setTimeout(() => {
      void validatePhrase(words);
    }, PHRASE_VALIDATION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [words, isComplete, resetValidation, validatePhrase]);

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

    setRestoring(true);
    setRestoreError('');
    try {
      await restoreWallet(words.join(' ').trim());
      navigation.reset({
        index: 0,
        routes: [{ name: 'BiometricUnlock' }],
      });
    } catch (err) {
      setRestoreError(
        (err instanceof Error && err.message) || 'Could not restore wallet',
      );
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

            setDeleting(true);
            try {
              await deleteWallet();
              setRestoreError('');
              setWords(EMPTY_PHRASE);
              resetValidation();
            } catch (err) {
              setRestoreError(
                (err instanceof Error && err.message) ||
                  'Could not delete wallet',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  const walletAlreadyExists =
    !!restoreError && isWalletAlreadyExistsError(restoreError);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Restore wallet</Text>
        <View style={styles.headerSpacer} />
      </View>
      {isScanning ? (
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
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>Enter recovery phrase</Text>
          <Text style={styles.description}>
            Type your 12-word phrase in order to restore your wallet on this
            device.
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
              <AppIcon
                name="checkmark-circle"
                size={14}
                color={colors.positive}
              />
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
              {isValidating
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
                      deleting
                        ? 'Removing saved wallet…'
                        : 'Replace with new phrase'
                    }
                    onPress={handleReplaceWallet}
                    disabled={deleting}
                    style={styles.openExistingButton}
                  />
                </>
              ) : null}
            </View>
          ) : null}
          <View style={styles.spacer} />
          <PrimaryButton
            title={restoring ? 'Restoring…' : 'Restore wallet'}
            onPress={handleRestore}
            disabled={!isValid || restoring}
          />
        </View>
      )}
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
