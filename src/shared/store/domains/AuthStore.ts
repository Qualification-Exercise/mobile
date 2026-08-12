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
import { Logger } from '../../lib/logger';

function clientType(): EClientType {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export class AuthStore {
  session: Session | null = null;
  isHydrated = false;

  private readonly logger = new Logger('AuthStore');

  constructor() {
    makeAutoObservable(this);

    this.logger.debug('Initializing; wiring auth API callbacks');
    configureAuth({
      getAccessToken: () => this.session?.accessToken ?? null,
      refreshTokens: () => this.refresh(),
      onTokensRefreshed: tokens => this.setSession(tokens),
      onAuthFailure: () => {
        this.logger.warn(
          'Auth API reported an unrecoverable failure; signing out',
        );
        this.signOut();
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
    // Never log token values — only the non-sensitive user id.
    this.logger.debug('Persisting session for user', session.user?.id);
    await saveSession(session);
    this.session = session;
    this.logger.debug('Session persisted');
  }

  setSession(session: Session): void {
    this.logger.debug('Session updated in memory (token refresh)');
    this.session = session;
  }

  async hydrate(): Promise<void> {
    this.logger.log('Hydrating session from storage');
    try {
      const session = await loadSession();
      if (session) {
        this.session = session;
        this.logger.log(
          'Restored persisted session for user',
          session.user?.id,
        );
      } else {
        this.logger.log('No persisted session found; starting signed out');
      }
    } finally {
      this.isHydrated = true;
      this.logger.debug('Hydration complete; isHydrated=true');
    }
  }

  async signOut(): Promise<void> {
    this.logger.log('Signing out');
    await clearSession();
    this.logger.debug('Local session storage cleared');
    try {
      await GoogleSignin.signOut();
      this.logger.debug('Google sign-out succeeded');
    } catch (error) {
      // Failed Google sign-out must not block local teardown.
      this.logger.warn(
        'Google sign-out failed; continuing local teardown',
        error,
      );
    }
    this.session = null;
    this.logger.log('Sign-out complete');
  }

  async signInWithGoogle(): Promise<boolean> {
    this.logger.log('Starting Google sign-in flow');
    try {
      // Ensure Play Services are available (Android)
      this.logger.debug('Checking Google Play Services availability');
      await GoogleSignin.hasPlayServices();
      // Prompt user sign in
      this.logger.debug('Prompting user for Google sign-in');
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // The user dismissed or cancelled the sign-in flow.
        this.logger.log('Google sign-in cancelled or dismissed by user');
        return false;
      }

      let idToken = response.data.idToken;
      if (!idToken) {
        // Android edge case: `signIn()` can return a null idToken. Fall back to
        // the explicit token fetch.
        this.logger.debug(
          'idToken absent on sign-in response; fetching via getTokens()',
        );
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }

      if (!idToken) {
        this.logger.error('Google Sign-In Error: missing idToken');
        return false;
      }

      this.logger.debug('Exchanging Google idToken with backend', clientType());
      const session = await authApi.google(idToken, clientType());

      await this.persistSession(session);

      this.logger.log('Google sign-in succeeded for user', session.user?.id);
      return true;
    } catch (error) {
      if (isErrorWithCode(error)) {
        this.logger.error('Google Sign-In Error:', error.code, error.message);
      } else {
        this.logger.error('Google Sign-In Error:', error);
      }
      return false;
    }
  }

  async refresh(): Promise<AuthTokens> {
    this.logger.debug('Refreshing auth tokens');
    const refreshToken = this.session?.refreshToken;
    if (!refreshToken) {
      this.logger.error('Token refresh failed: no refresh token available');
      throw new Error('No refresh token available');
    }

    const tokens = await authApi.refresh(refreshToken);
    await this.persistSession(tokens);
    this.logger.log('Auth tokens refreshed');
    return tokens;
  }
}
