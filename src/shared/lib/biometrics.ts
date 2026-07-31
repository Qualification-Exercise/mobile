import * as LocalAuthentication from 'expo-local-authentication';

// Whether the device has biometric hardware AND the user has enrolled at least
// one credential (face/fingerprint). Both must be true before we prompt, since
// `authenticateAsync` would otherwise fail immediately.
export async function isBiometricAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  return hasHardware && isEnrolled;
}

// Outcome of a biometric prompt. We keep the failure `error` code rather than
// collapsing to a boolean so callers can distinguish a revoked app permission
// (route to Settings) from a transient cancel/lockout (just retry).
export type BiometricAuthResult =
  | { success: true }
  | { success: false; error: LocalAuthentication.LocalAuthenticationError };

// Prompt the user for a biometric (or device-passcode fallback) scan. Resolves
// `{ success: true }` on a match, otherwise `{ success: false, error }` carrying
// the OS error code so callers can react to the specific failure reason.
export async function authenticateWithBiometrics(
  promptMessage: string,
): Promise<BiometricAuthResult> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    // Fall back to the device passcode so users without/behind a locked-out
    // sensor can still authenticate rather than being hard-blocked.
    disableDeviceFallback: false,
  });

  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}
