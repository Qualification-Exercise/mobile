import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useWallet } from '@features/wallet-seed-phrase';
import {
  PrimaryButton,
  ScreenContainer,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { useStore } from '@shared/store';

export const BiometricUnlockScreen = observer(function BiometricUnlockScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { hasPersistedWallet, getStateStatus, unlock } = useWallet();
  const { biometryStore } = useStore();

  async function runUnlock() {
    const outcome = await biometryStore.verify('Unlock WDK Wallet');

    switch (outcome) {
      case 'unlocked': {

        if (hasPersistedWallet()) {
          if (getStateStatus() === 'LOCKED') {
            try {
              console.log("Unlocking wallet");
              await unlock();
            } catch (err) {
              console.log( (err instanceof Error && err.message) || "Unlock failed");
              return;
            }
          }

          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'WalletSetup' }] });
        }

        return;
      }
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
    runUnlock();
  }, []);

  return (
    <ScreenContainer>
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
            runUnlock();
          }}
        />
      </View>
    </ScreenContainer>
  );
});

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
