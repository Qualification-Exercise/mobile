import * as Keychain from 'react-native-keychain';
import type { GoogleAccount } from '../store/domains/AuthStore';

// Keychain stores string key/value pairs per `service`. We namespace the Google
// account under its own service so it can be read/cleared independently.
const AUTH_SERVICE = 'com.wdkqualification.googleAccount';

// The keychain `username` slot is required but unused for our JSON blob.
const ACCOUNT_KEY = 'googleAccount';

// Persist the signed-in Google account to the device keychain/keystore.
export async function saveGoogleAccount(account: GoogleAccount): Promise<void> {
  await Keychain.setGenericPassword(ACCOUNT_KEY, JSON.stringify(account), {
    service: AUTH_SERVICE,
  });
}

// Load the persisted Google account, or `null` if none is stored or the stored
// value is unreadable.
export async function loadGoogleAccount(): Promise<GoogleAccount | null> {
  const credentials = await Keychain.getGenericPassword({
    service: AUTH_SERVICE,
  });

  if (!credentials) {
    return null;
  }

  try {
    return JSON.parse(credentials.password) as GoogleAccount;
  } catch {
    // Corrupted/legacy payload — drop it so callers fall back to a clean state.
    return null;
  }
}

// Remove the persisted Google account from the keychain.
export async function clearGoogleAccount(): Promise<void> {
  await Keychain.resetGenericPassword({ service: AUTH_SERVICE });
}
