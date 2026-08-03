import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import {
  PressableButton,
  SecondaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';

type WalletSetupProps = {
  onCreateWallet: () => void;
  onRestoreWallet: () => void;
};

function WalletSetupView({
  onCreateWallet,
  onRestoreWallet,
}: WalletSetupProps) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markGlyph}>W</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.title}>Set up your wallet</Text>
          <Text style={styles.tagline}>
            Create a new wallet or restore one with your 12-word recovery
            phrase.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <PressableButton title="Create new wallet" onPress={onCreateWallet} />
        <SecondaryButton
          title="Restore with recovery phrase"
          onPress={onRestoreWallet}
        />
        <Text style={styles.footer}>
          Your recovery phrase is the only way to recover this wallet.
        </Text>
      </View>
    </View>
  );
}

export const WalletSetup = observer(WalletSetupView);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  mark: {
    width: 84,
    height: 84,
    borderRadius: radii.xxl,
    backgroundColor: colors.accentBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGlyph: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.background,
  },
  heroText: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tagline: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    gap: spacing.md,
  },
  footer: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
