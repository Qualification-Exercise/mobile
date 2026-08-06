import { makeAutoObservable } from 'mobx';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { authApi, configureAuth } from '@shared/api';
import type { AuthTokens, AuthUser, EClientType } from '@shared/api';
import {
  clearSession,
  loadSession,
  saveSession,
  type Session,
} from '../../lib/authStorage';

function clientType(): EClientType {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export class AuthStore {
  session: Session | null = null;
  isHydrated = false;

  constructor() {
    makeAutoObservable(this);

    configureAuth({
      getAccessToken: () => this.session?.accessToken ?? null,
      refreshTokens: () => this.refresh(),
      onTokensRefreshed: tokens => this.setSession(tokens),
      onAuthFailure: () => {
        void this.signOut();
      },
    });
  }

  get isAuthenticated(): boolean {
    return Boolean(this.session?.accessToken);
  }

  get user(): AuthUser | null {
    return this.session?.user ?? null;
  }

  private async persistSession(session: Session): Promise<void> {
    await saveSession(session);
    this.session = session;
  }

  setSession(session: Session): void {
    this.session = session;
  }

  async hydrate(): Promise<void> {
    try {
      const session = await loadSession();
      if (session) {
        this.session = session;
      }
    } finally {
      this.isHydrated = true;
    }
  }

  async signOut(): Promise<void> {
    await clearSession();
    try {
      await GoogleSignin.signOut();
    } catch {
      // Failed Google sign-out must not block local teardown.
    }
    this.session = null;
  }

  async signInWithGoogle(): Promise<boolean> {
    try {
      // Ensure Play Services are available (Android)
      await GoogleSignin.hasPlayServices();
      // Prompt user sign in
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // The user dismissed or cancelled the sign-in flow.
        return false;
      }

      let idToken = response.data.idToken;
      if (!idToken) {
        // Android edge case: `signIn()` can return a null idToken. Fall back to
        // the explicit token fetch.
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }

      if (!idToken) {
        console.error('Google Sign-In Error: missing idToken');
        return false;
      }

      const session = await authApi.google(idToken, clientType());

      await this.persistSession(session);

      return true;
    } catch (error) {
      if (isErrorWithCode(error)) {
        console.error('Google Sign-In Error:', error.code, error.message);
      } else {
        console.error('Google Sign-In Error:', error);
      }
      return false;
    }
  }

  async refresh(): Promise<AuthTokens> {
    const refreshToken = this.session?.refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokens = await authApi.refresh(refreshToken);
    await this.persistSession(tokens);
    return tokens;
  }
}
