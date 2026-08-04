import type { RootStackParamList } from './types';

type BootContext = {
  isAuthenticated: boolean;
  isBiometryEnrolled: boolean;
};

export function resolveBootRoute({
  isAuthenticated,
  isBiometryEnrolled,
}: BootContext): keyof RootStackParamList {
  if (!isAuthenticated) {
    return 'SignIn';
  }

  if (!isBiometryEnrolled) {
    return 'EnableBiometric';
  }

  return 'BiometricUnlock';
}
