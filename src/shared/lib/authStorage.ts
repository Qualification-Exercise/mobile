import * as Keychain from 'react-native-keychain';
import type { AuthTokens } from '@shared/api';

// The persisted session: the access/refresh tokens plus the authenticated user.
export type Session = AuthTokens;

// Keychain stores string key/value pairs per `service`. We namespace the session
// under its own service so it can be read/cleared independently of other
// secure-storage material (e.g. the biometry preference).
const SESSION_SERVICE = 'com.wdkqualification.session';

// The keychain `username` slot is required but unused for our JSON blob.
const SESSION_KEY = 'session';

// Persist the signed-in session to the device keychain/keystore.
export async function saveSession(session: Session): Promise<void> {
  await Keychain.setGenericPassword(SESSION_KEY, JSON.stringify(session), {
    service: SESSION_SERVICE,
  });
}

// Load the persisted session, or `null` if none is stored or the stored value
// is unreadable.
export async function loadSession(): Promise<Session | null> {
  const credentials = await Keychain.getGenericPassword({
    service: SESSION_SERVICE,
  });

  if (!credentials) {
    return null;
  }

  try {
    return JSON.parse(credentials.password) as Session;
  } catch {
    // Corrupted/legacy payload — drop it so callers fall back to a clean state.
    return null;
  }
}

// Remove the persisted session from the keychain.
export async function clearSession(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SESSION_SERVICE });
}
