import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  PressableButton,
  SecondaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { useStore } from '@shared/store';

type SsoSignInProps = {
  onRestore: () => void;
  onOpenWallet?: () => void;
  openWalletLoading?: boolean;
  openWalletError?: string;
};

function SsoSignInView({
  onRestore,
  onOpenWallet,
  openWalletLoading,
  openWalletError,
}: SsoSignInProps) {
  const { authStore } = useStore();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markGlyph}>W</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.title}>WDK Wallet</Text>
          <Text style={styles.tagline}>
            Your keys, your crypto.{'\n'}A self-custodial wallet you fully
            control.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <PressableButton
          title="Continue with Google"
          busyTitle="Signing in…"
          onPress={() => authStore.signInWithGoogle()}
        />
        {onOpenWallet ? (
          <>
            <SecondaryButton
              title={
                openWalletLoading ? 'Opening wallet…' : 'Open saved wallet'
              }
              onPress={onOpenWallet}
              disabled={openWalletLoading}
            />
            {openWalletError ? (
              <Text style={styles.openWalletError}>{openWalletError}</Text>
            ) : null}
          </>
        ) : null}
        <TouchableOpacity onPress={onRestore}>
          <Text style={styles.restore}>
            Already have a wallet?{' '}
            <Text style={styles.restoreLink}>Restore</Text>
          </Text>
        </TouchableOpacity>
        <Text style={styles.footer}>
          Secured by single sign-on.{'\n'}Powered by WDK.
        </Text>
      </View>
    </View>
  );
}

export const SsoSignIn = observer(SsoSignInView);

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
  restore: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  restoreLink: {
    color: colors.accentBright,
    fontWeight: '700',
  },
  openWalletError: {
    fontSize: 12.5,
    color: '#E0715A',
    textAlign: 'center',
    lineHeight: 18,
  },
});
