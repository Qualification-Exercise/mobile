import * as Keychain from 'react-native-keychain';

const BACKEND_AUTH_SERVICE = 'com.wdkqualification.backendSession';
const SESSION_KEY = 'backendSession';

export type BackendSession = {
  accessToken: string;
  refreshToken: string;
};

export async function saveBackendSession(
  session: BackendSession,
): Promise<void> {
  await Keychain.setGenericPassword(SESSION_KEY, JSON.stringify(session), {
    service: BACKEND_AUTH_SERVICE,
  });
}

export async function loadBackendSession(): Promise<BackendSession | null> {
  const credentials = await Keychain.getGenericPassword({
    service: BACKEND_AUTH_SERVICE,
  });

  if (!credentials) {
    return null;
  }

  try {
    const parsed = JSON.parse(credentials.password) as BackendSession;
    if (!parsed.accessToken || !parsed.refreshToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearBackendSession(): Promise<void> {
  await Keychain.resetGenericPassword({ service: BACKEND_AUTH_SERVICE });
}
