import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import {
  PrimaryButton,
  ScreenContainer,
  colors,
  radii,
  spacing,
} from '@shared/ui';

const FEATURES = [
  'Unlock app on launch',
  'Approve sends & signatures',
  'Guard account setup',
];

export const EnableBiometricScreen = observer(
  function EnableBiometricScreenView() {
    const navigation = useNavigation<RootStackNavigationProp>();
    const { biometryStore } = useStore();

    useEffect(() => {
      if (biometryStore.isEnrolled) {
        navigation.reset({ index: 0, routes: [{ name: 'BiometricUnlock' }] });
      }
    }, [biometryStore.isEnrolled, navigation]);

    async function handleEnable() {
      const outcome = await biometryStore.enableBiometric(
        'Enable biometric unlock',
      );

      switch (outcome) {
        case 'unlocked':
          navigation.reset({ index: 0, routes: [{ name: 'WalletSetup' }] });
          return;
        case 'permission-denied':
          Alert.alert(
            'Face ID is turned off for this app',
            'Enable Face ID for this app in Settings, then come back and try again.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        case 'unavailable':
        case 'failed':
          Alert.alert(
            'Face ID unavailable',
            'We could not verify your biometrics. Make sure Face ID is set up on this device, then try again.',
          );
          return;
      }
    }

    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.hero}>
            <View style={styles.iconFrame}>
              <View style={styles.iconInner} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.title}>Enable Face ID</Text>
              <Text style={styles.description}>
                Use Face ID to unlock the app and approve every transaction.
                Your biometrics never leave the device.
              </Text>
            </View>
            <View style={styles.featureList}>
              {FEATURES.map(feature => (
                <View key={feature} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✓</Text>
                  <Text style={styles.featureLabel}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
          <PrimaryButton title="Enable Face ID" onPress={handleEnable} />
        </View>
      </ScreenContainer>
    );
  },
);

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
  featureList: {
    width: '100%',
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  featureCheck: {
    color: colors.accentBright,
  },
  featureLabel: {
    fontSize: 13.5,
    color: colors.textPrimary,
  },
});
