import * as Keychain from 'react-native-keychain';

// Namespaced independently from the Google account so the biometry preference
// can be read/cleared without touching the session.
const BIOMETRY_SERVICE = 'com.wdkqualification.biometryPreference';

// The keychain `username` slot is required but unused for this flag.
const PREFERENCE_KEY = 'biometryEnabled';

// Persist whether the user has opted into biometric unlock. Disabling clears the
// entry entirely so a fresh install / cleared keychain reads as "not enabled".
export async function saveBiometryEnabled(enabled: boolean): Promise<void> {
  if (!enabled) {
    await Keychain.resetGenericPassword({ service: BIOMETRY_SERVICE });
    return;
  }

  await Keychain.setGenericPassword(PREFERENCE_KEY, 'true', {
    service: BIOMETRY_SERVICE,
  });
}

// Load the persisted biometry preference, defaulting to `false` when nothing is
// stored.
export async function loadBiometryEnabled(): Promise<boolean> {
  const credentials = await Keychain.getGenericPassword({
    service: BIOMETRY_SERVICE,
  });

  return credentials !== false && credentials.password === 'true';
}
