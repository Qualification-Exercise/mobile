import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useStore } from '@shared/store';
import { PrimaryButton, colors, radii, spacing } from '@shared/ui';

type UnlockBiometricProps = {
  autoPrompt?: boolean;
  onUnlocked: () => void;
};

function UnlockBiometricView({
  autoPrompt = false,
  onUnlocked,
}: UnlockBiometricProps) {
  const { biometryStore } = useStore();

  async function runUnlock() {
    const outcome = await biometryStore.verify('Unlock WDK Wallet');

    switch (outcome) {
      case 'unlocked':
        onUnlocked();
        return;
      case 'failed':
        return;
      case 'permission-denied':
      case 'unavailable':
        Alert.alert(
          'Face ID unavailable',
          'We could not verify your biometrics. Make sure Face ID is set up on this device, then try again.',
        );
        return;
    }
  }

  useEffect(() => {
    if (autoPrompt) {
      void runUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrompt]);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconFrame}>
          <View style={styles.iconInner} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.title}>Unlock WDK Wallet</Text>
          <Text style={styles.description}>
            Verify your identity to open your wallet.
          </Text>
        </View>
      </View>
      <PrimaryButton
        title="Unlock with Face ID"
        onPress={() => {
          void runUnlock();
        }}
      />
    </View>
  );
}

export const UnlockBiometric = observer(UnlockBiometricView);

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
  iconFrame: {
    width: 110,
    height: 110,
    borderRadius: radii.xxl,
    borderWidth: 2,
    borderColor: 'rgba(45,190,140,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.accentBright,
  },
  heroText: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 21,
  },
});
