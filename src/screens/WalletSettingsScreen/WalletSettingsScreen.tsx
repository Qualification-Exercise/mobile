import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import { useWallet } from '@shared/lib/hooks/wallet';
import {
  AppIcon,
  HeaderBackButton,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { SeedWordGrid } from '@widgets/seed-word-grid';

function splitMnemonic(mnemonic: string): string[] {
  return mnemonic.trim().split(/\s+/);
}

export function WalletSettingsScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { authStore, biometryStore } = useStore();
  const { getMnemonic, deleteWallet } = useWallet();

  const [revealedWords, setRevealedWords] = useState<string[]>([]);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleRevealPhrase() {
    const outcome = await biometryStore.verify('View recovery phrase');
    if (outcome !== 'unlocked') {
      return;
    }

    setRevealing(true);
    setRevealError('');
    try {
      const mnemonic = await getMnemonic();
      if (!mnemonic) {
        throw new Error('Could not read recovery phrase');
      }
      setRevealedWords(splitMnemonic(mnemonic));
    } catch (err) {
      setRevealError(
        (err instanceof Error && err.message) ||
          'Could not reveal recovery phrase',
      );
    } finally {
      setRevealing(false);
    }
  }

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(revealedWords.join(' '));
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

  function handleDeleteWallet() {
    Alert.alert(
      'Delete wallet?',
      'This removes your wallet and signs you out on this device. You will need your recovery phrase to restore it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const outcome = await biometryStore.verify('Delete wallet');
            if (outcome !== 'unlocked') {
              return;
            }

            setDeleting(true);
            setDeleteError('');
            try {
              await deleteWallet();
              await authStore.signOut();
              navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
            } catch (err) {
              setDeleteError(
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

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Wallet settings</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.section}>
          <Text style={styles.sectionDescription}>
            View your recovery phrase on this device.
          </Text>
          <SecondaryButton
            title={
              revealing
                ? 'Authenticating…'
                : revealedWords.length === 12
                ? 'Hide recovery phrase'
                : 'View recovery phrase'
            }
            onPress={() => {
              if (revealedWords.length === 12) {
                setRevealedWords([]);
                return;
              }
              void handleRevealPhrase();
            }}
            disabled={revealing}
          />
          {revealing ? (
            <View style={styles.revealLoading}>
              <ActivityIndicator size="small" color={colors.accentBright} />
              <Text style={styles.revealLoadingText}>
                Confirm with biometrics to view your phrase
              </Text>
            </View>
          ) : null}
          {revealError ? (
            <Text style={styles.errorText}>{revealError}</Text>
          ) : null}
          {revealedWords.length === 12 ? (
            <View style={styles.revealBlock}>
              <View style={styles.warning}>
                <Text style={styles.warningText}>
                  Never share your phrase. Anyone with these words can access
                  your funds.
                </Text>
              </View>
              <SeedWordGrid words={revealedWords} />
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
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Danger zone</Text>
        <View style={styles.section}>
          <Text style={styles.sectionDescription}>
            Permanently remove this wallet from secure storage on this device.
          </Text>
          <PrimaryButton
            title={deleting ? 'Deleting…' : 'Delete wallet'}
            onPress={handleDeleteWallet}
            disabled={deleting}
            style={styles.deleteButton}
          />
          {deleteError ? (
            <Text style={styles.errorText}>{deleteError}</Text>
          ) : null}
        </View>
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
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  section: {
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  sectionDescription: {
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  revealLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  revealLoadingText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  revealBlock: {
    gap: spacing.md,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
    backgroundColor: 'rgba(224,113,90,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(224,113,90,0.25)',
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  warningText: {
    color: '#E0715A',
    fontSize: 12.5,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12.5,
    color: '#E0715A',
    lineHeight: 18,
  },
  deleteButton: {
    backgroundColor: '#8B2E2E',
  },
});
