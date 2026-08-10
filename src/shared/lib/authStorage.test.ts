import * as Keychain from 'react-native-keychain';
import type { Session } from './authStorage';
import { clearSession, loadSession, saveSession } from './authStorage';

const getGenericPassword = Keychain.getGenericPassword as jest.Mock;
const setGenericPassword = Keychain.setGenericPassword as jest.Mock;
const resetGenericPassword = Keychain.resetGenericPassword as jest.Mock;

const SERVICE = 'com.wdkqualification.session';

const session: Session = {
  accessToken: 'access',
  refreshToken: 'refresh',
  user: { id: 'u1', email: null, firstName: null, lastName: null },
};

describe('authStorage', () => {
  it('persists the session as JSON under its own service', async () => {
    await saveSession(session);
    expect(setGenericPassword).toHaveBeenCalledWith(
      'session',
      JSON.stringify(session),
      { service: SERVICE },
    );
  });

  it('loads and parses a stored session', async () => {
    getGenericPassword.mockResolvedValueOnce({
      password: JSON.stringify(session),
    });
    await expect(loadSession()).resolves.toEqual(session);
  });

  it('returns null when nothing is stored', async () => {
    getGenericPassword.mockResolvedValueOnce(false);
    await expect(loadSession()).resolves.toBeNull();
  });

  it('drops a corrupt payload rather than throwing', async () => {
    getGenericPassword.mockResolvedValueOnce({ password: 'not json' });
    await expect(loadSession()).resolves.toBeNull();
  });

  it('clears the session by resetting its service', async () => {
    await clearSession();
    expect(resetGenericPassword).toHaveBeenCalledWith({ service: SERVICE });
  });
});
