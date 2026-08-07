import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert, Clipboard, StyleSheet, Text, View } from 'react-native';
import { validateMnemonic } from '@tetherto/wdk-react-native-core';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import {
  isWalletAlreadyExistsError,
  useWallet,
} from '@shared/lib/hooks/wallet';
import {
  HeaderBackButton,
  KeyboardAvoidingView,
  PrimaryButton,
  ScreenContainer,
  colors,
  spacing,
} from '@shared/ui';
import { SeedWordInputGrid } from '@widgets/seed-word-input-grid';

function parsePhraseInput(text: string): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length === 12 ? words : null;
}

const EMPTY_PHRASE = Array(12).fill('');

function isShapeValid(words: string[]): boolean {
  return validateMnemonic(words.join(' ').trim());
}

export function RestoreWalletScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { biometryStore, secretsStore } = useStore();
  const { restoreWallet, unlock } = useWallet();
  const [words, setWords] = useState<string[]>(EMPTY_PHRASE);
  const [restoring, setRestoring] = useState(false);
  const filledCount = words.filter(word => word.trim().length > 0).length;

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

  async function handleRestore() {
    const mnemonic = words.join(' ').trim();

    // 1. Validate the 12-word BIP-39 phrase before doing anything else.
    if (filledCount !== 12 || !isShapeValid(words)) {
      Alert.alert(
        'Invalid recovery phrase',
        'Enter a valid 12-word recovery phrase and try again.',
      );
      return;
    }

    // 2. Confirm with biometrics before importing.
    const outcome = await biometryStore.verify('Restore wallet');
    if (outcome !== 'unlocked') {
      return;
    }

    setRestoring(true);
    try {
      // 3. The server is the source of truth. Only accept a phrase that matches
      // the wallet stored for this account; fail closed on any lookup error.
      const matches = await secretsStore.matchMnemonic(mnemonic);
      if (!matches) {
        Alert.alert('Something went wrong!', 'Could not restore wallet');
        return;
      }

      // 4. Attempt the restore; surface any failure below.
      await restoreWallet(mnemonic);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (err) {
      const message =
        (err instanceof Error && err.message) || 'Could not restore wallet';

      console.error(message);

      // A wallet already lives in secure storage under this id (e.g. the
      // Keychain entry survived an app reinstall while the cached wallet list
      // did not). Never delete it — the phrase behind it may be the user's
      // only copy. Offer to open the existing wallet instead of recreating it.
      if (isWalletAlreadyExistsError(message)) {
        try {
          await openExistingWallet();
          return;
        } catch (err) {
          console.error(
            (err instanceof Error && err.message) || 'Could not open wallet',
          );
        }
      }

      Alert.alert('Something went wrong!', 'Could not restore wallet');
    } finally {
      setRestoring(false);
    }
  }

  // Load the wallet already stored in secure storage. Unlike restore, this
  // needs no mnemonic and overwrites/deletes nothing — it just re-opens what
  // is already on disk.
  async function openExistingWallet() {
    try {
      await unlock();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      throw err;
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Restore wallet</Text>
        <View style={styles.headerSpacer} />
      </View>
      <KeyboardAvoidingView style={styles.container}>
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
        </View>
        <View style={styles.gridWrapper}>
          <SeedWordInputGrid words={words} onChangeWord={handleChangeWord} />
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.status}>{`${filledCount} / 12 words`}</Text>
        </View>
        <View style={styles.spacer} />
        <PrimaryButton
          title={restoring ? 'Restoring…' : 'Restore wallet'}
          onPress={handleRestore}
          disabled={restoring}
        />
      </KeyboardAvoidingView>
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
});
