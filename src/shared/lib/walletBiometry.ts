import type { BiometryStore } from '../store/domains/BiometryStore';

// Prompt for wallet biometrics and return whether the user unlocked.
export async function requireWalletBiometry(
  biometryStore: BiometryStore,
  prompt: string,
): Promise<boolean> {
  const outcome = await biometryStore.verify(prompt);
  return outcome === 'unlocked';
}
