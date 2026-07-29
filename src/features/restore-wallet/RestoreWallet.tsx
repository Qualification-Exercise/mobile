import { useState } from 'react';
import {
  Clipboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStore } from '@shared/store';
import {
  PrimaryButton,
  SecondaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { QrPlaceholder } from '@widgets/qr-placeholder';
import { SeedWordInputGrid } from '@widgets/seed-word-input-grid';
import {
  MOCK_SCANNED_PHRASE,
  isPlausiblePhrase,
  parsePhraseInput,
} from './lib';

const EMPTY_PHRASE = Array(12).fill('');

type RestoreWalletProps = {
  onRestore: () => void;
};

export function RestoreWallet({ onRestore }: RestoreWalletProps) {
  const { walletStore } = useStore();
  const [words, setWords] = useState<string[]>(EMPTY_PHRASE);
  const [isScanning, setIsScanning] = useState(false);

  const filledCount = words.filter(word => word.trim().length > 0).length;
  const isComplete = filledCount === 12;
  const isValid = isComplete && isPlausiblePhrase(words);

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

  function handleRestore() {
    walletStore.restoreWallet(words);
    onRestore();
  }

  if (isScanning) {
    return (
      <View style={styles.scanContainer}>
        <View style={styles.scanHeader}>
          <TouchableOpacity onPress={() => setIsScanning(false)}>
            <Text style={styles.scanClose}>✕</Text>
          </TouchableOpacity>
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
          title="⊞ Paste"
          onPress={handlePaste}
          style={styles.actionButton}
        />
        <SecondaryButton
          title="⊡ Scan QR"
          onPress={() => setIsScanning(true)}
          style={styles.actionButton}
        />
      </View>
      <View style={styles.gridWrapper}>
        <SeedWordInputGrid words={words} onChangeWord={handleChangeWord} />
      </View>
      <Text
        style={[
          styles.status,
          isComplete && (isValid ? styles.statusValid : styles.statusInvalid),
        ]}
      >
        {isComplete
          ? isValid
            ? `✓ Valid BIP-39 phrase · ${filledCount} / 12 words`
            : `Invalid phrase · ${filledCount} / 12 words`
          : `${filledCount} / 12 words`}
      </Text>
      <View style={styles.spacer} />
      <PrimaryButton
        title="Restore wallet"
        onPress={handleRestore}
        disabled={!isValid}
      />
    </View>
  );
}

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
  status: {
    marginTop: spacing.md,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  statusValid: {
    color: colors.positive,
  },
  statusInvalid: {
    color: '#E0715A',
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
  scanClose: {
    fontSize: 22,
    color: colors.textPrimary,
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
