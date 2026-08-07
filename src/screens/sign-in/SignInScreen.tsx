import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import {
  PressableButton,
  ScreenContainer,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { useStore } from '@shared/store';

export const SignInScreen = observer(function SignInScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { authStore } = useStore();

  const handleSignIn = useCallback(async () => {
    const isAuthenticated = await authStore.signInWithGoogle();
    if (isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'EnableBiometric' }] });
    }
  }, [authStore, navigation]);

  return (
    <ScreenContainer>
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
            onPress={handleSignIn}
          />
          <Text style={styles.footer}>
            Secured by single sign-on.{'\n'}Powered by WDK.
          </Text>
        </View>
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
