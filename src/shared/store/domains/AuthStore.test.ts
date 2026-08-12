import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import NetInfo from '@react-native-community/netinfo';
import { authApi, configureAuth } from '@shared/api';
import { clearSession, loadSession, saveSession } from '../../lib/authStorage';
import { AuthStore } from './AuthStore';

jest.mock('@shared/api', () => ({
  configureAuth: jest.fn(),
  authApi: { google: jest.fn(), refresh: jest.fn() },
}));
jest.mock('../../lib/authStorage', () => ({
  saveSession: jest.fn().mockResolvedValue(undefined),
  loadSession: jest.fn(),
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

const mockGoogle = authApi.google as jest.Mock;
const mockRefresh = authApi.refresh as jest.Mock;
const mockLoadSession = loadSession as jest.Mock;
const mockClearSession = clearSession as jest.Mock;
const mockSaveSession = saveSession as jest.Mock;
const signIn = GoogleSignin.signIn as jest.Mock;
const getTokens = GoogleSignin.getTokens as jest.Mock;
const googleSignOut = GoogleSignin.signOut as jest.Mock;
const mockIsSuccess = isSuccessResponse as unknown as jest.Mock;
const netInfoFetch = NetInfo.fetch as jest.Mock;

const session = {
  accessToken: 'a',
  refreshToken: 'r',
  user: { id: 'u1', email: null, firstName: null, lastName: null },
};

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('authentication state', () => {
  it('derives isAuthenticated and user from the session', () => {
    const store = new AuthStore();
    expect(store.isAuthenticated).toBe(false);
    store.setSession(session);
    expect(store.isAuthenticated).toBe(true);
    expect(store.user).toEqual(session.user);
  });
});

describe('hydrate', () => {
  it('adopts a persisted session', async () => {
    mockLoadSession.mockResolvedValue(session);
    const store = new AuthStore();
    await store.hydrate();
    expect(store.session).toEqual(session);
    expect(store.isHydrated).toBe(true);
  });

  it('marks hydrated even when loading fails (error still propagates)', async () => {
    mockLoadSession.mockRejectedValue(new Error('keychain'));
    const store = new AuthStore();
    await expect(store.hydrate()).rejects.toThrow('keychain');
    expect(store.session).toBeNull();
    expect(store.isHydrated).toBe(true);
  });
});

describe('signInWithGoogle', () => {
  it('persists the session on success', async () => {
    signIn.mockResolvedValueOnce({ data: { idToken: 'idt' } });
    mockGoogle.mockResolvedValueOnce(session);

    const store = new AuthStore();
    await expect(store.signInWithGoogle()).resolves.toBe(true);
    expect(mockSaveSession).toHaveBeenCalledWith(session);
    expect(store.isAuthenticated).toBe(true);
  });

  it('returns false when the user cancels', async () => {
    mockIsSuccess.mockReturnValueOnce(false);
    const store = new AuthStore();
    await expect(store.signInWithGoogle()).resolves.toBe(false);
  });

  it('falls back to getTokens when signIn returns no idToken', async () => {
    signIn.mockResolvedValueOnce({ data: { idToken: null } });
    getTokens.mockResolvedValueOnce({ idToken: 'idt-2' });
    mockGoogle.mockResolvedValueOnce(session);

    const store = new AuthStore();
    await expect(store.signInWithGoogle()).resolves.toBe(true);
    expect(mockGoogle).toHaveBeenCalledWith('idt-2', expect.any(String));
  });

  it('returns false when no idToken can be obtained', async () => {
    signIn.mockResolvedValueOnce({ data: { idToken: null } });
    getTokens.mockResolvedValueOnce({ idToken: null });
    const store = new AuthStore();
    await expect(store.signInWithGoogle()).resolves.toBe(false);
  });

  it('returns false when the flow fails for a non-cancellation reason', async () => {
    signIn.mockRejectedValueOnce(new Error('play services'));
    const store = new AuthStore();
    await expect(store.signInWithGoogle()).resolves.toBe(false);
  });

  it('returns false when Google reports the user cancelled', async () => {
    (isErrorWithCode as unknown as jest.Mock).mockReturnValueOnce(true);
    signIn.mockRejectedValueOnce({ code: 'SIGN_IN_CANCELLED', message: 'x' });
    const store = new AuthStore();
    await expect(store.signInWithGoogle()).resolves.toBe(false);
  });

  it('logs and returns false for a coded non-cancellation error', async () => {
    const isCoded = isErrorWithCode as unknown as jest.Mock;
    isCoded.mockReturnValue(true);
    signIn.mockRejectedValueOnce({ code: 'DEVELOPER_ERROR', message: 'bad' });
    const store = new AuthStore();
    await expect(store.signInWithGoogle()).resolves.toBe(false);
    isCoded.mockReturnValue(false);
  });

  it('returns false without prompting sign-in when the device is offline', async () => {
    netInfoFetch.mockResolvedValueOnce({ isConnected: false });
    const store = new AuthStore();
    await expect(store.signInWithGoogle()).resolves.toBe(false);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('returns false without prompting sign-in when connectivity is unknown (isConnected null)', async () => {
    netInfoFetch.mockResolvedValueOnce({ isConnected: null });
    const store = new AuthStore();
    await expect(store.signInWithGoogle()).resolves.toBe(false);
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe('the auth bridge wired into httpClient', () => {
  it('bridges token access, refresh, and failure back to the store', async () => {
    const store = new AuthStore();
    const bridge = (configureAuth as jest.Mock).mock.calls[0][0];

    store.setSession(session);
    expect(bridge.getAccessToken()).toBe('a');

    bridge.onTokensRefreshed({ ...session, accessToken: 'b' });
    expect(store.session?.accessToken).toBe('b');

    mockRefresh.mockResolvedValueOnce(session);
    await expect(bridge.refreshTokens()).resolves.toEqual(session);

    bridge.onAuthFailure();
    await Promise.resolve();
    expect(mockClearSession).toHaveBeenCalled();
  });
});

describe('refresh', () => {
  it('throws without a refresh token', async () => {
    const store = new AuthStore();
    await expect(store.refresh()).rejects.toThrow('No refresh token available');
  });

  it('exchanges the refresh token and persists the result', async () => {
    mockRefresh.mockResolvedValueOnce(session);
    const store = new AuthStore();
    store.setSession(session);
    await expect(store.refresh()).resolves.toEqual(session);
    expect(mockSaveSession).toHaveBeenCalledWith(session);
  });
});

describe('signOut', () => {
  it('clears local state even if Google sign-out fails', async () => {
    googleSignOut.mockRejectedValueOnce(new Error('google'));
    const store = new AuthStore();
    store.setSession(session);
    await store.signOut();
    expect(mockClearSession).toHaveBeenCalled();
    expect(store.session).toBeNull();
  });
});
