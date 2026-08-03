import type { RootStackParamList } from './types';

type BootContext = {
  isAuthenticated: boolean;
  isBiometryEnrolled: boolean;
  persistedWalletExists: boolean;
};

// First incomplete onboarding gate wins. Wallet unlock (BiometricUnlock) runs
// after wallet setup when a persisted wallet exists.
export function resolveBootRoute({
  isAuthenticated,
  isBiometryEnrolled,
  persistedWalletExists,
}: BootContext): keyof RootStackParamList {
  if (!isAuthenticated) {
    return 'SignIn';
  }

  if (!isBiometryEnrolled) {
    return 'EnableBiometric';
  }

  if (!persistedWalletExists) {
    return 'WalletSetup';
  }

  return 'BiometricUnlock';
}
