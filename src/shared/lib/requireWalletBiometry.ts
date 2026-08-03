import type { BiometryStore } from '@shared/store/domains/BiometryStore';

export async function requireWalletBiometry(
  biometryStore: BiometryStore,
  prompt: string,
): Promise<boolean> {
  if (!biometryStore.isEnrolled) {
    return true;
  }

  const outcome = await biometryStore.verify(prompt);
  return outcome === 'unlocked';
}
