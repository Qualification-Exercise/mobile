import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import {
  clearBackendSession,
  saveBackendSession,
} from '@shared/lib/backendAuthStorage';
import { getBackendApiUrl } from '@shared/config/backend';
import { backendRequest } from './client';
import type { AuthTokenResponse, BackendClientType } from './types';
import { BackendApiError } from './types';

const AUTH_LOG_PREFIX = '[BackendAuth]';

function decodeJwtClaims(
  idToken: string,
): { aud?: string; exp?: number; email?: string } | null {
  try {
    const payloadSegment = idToken.split('.')[1];
    if (!payloadSegment) {
      return null;
    }

    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const json = globalThis.atob(padded);
    return JSON.parse(json) as { aud?: string; exp?: number; email?: string };
  } catch {
    return null;
  }
}

function logIdTokenClaims(idToken: string): void {
  const claims = decodeJwtClaims(idToken);
  if (!claims) {
    console.warn(`${AUTH_LOG_PREFIX} could not decode idToken claims`);
    return;
  }

  console.log(`${AUTH_LOG_PREFIX} idToken claims`, {
    aud: claims.aud,
    email: claims.email,
    exp: claims.exp,
    expiresInSec: claims.exp
      ? Math.max(0, claims.exp - Math.floor(Date.now() / 1000))
      : undefined,
  });
}

// @react-native-google-signin issues idTokens whose `aud` is the configured
// webClientId (OAuth server client), not the iOS/Android client id. The
// qualification backend verifies against GOOGLE_WEB_CLIENT_ID when type=web.
function buildGoogleClientTypeAttempts(idToken: string): BackendClientType[] {
  const aud = decodeJwtClaims(idToken)?.aud?.trim();
  const webClientId = GOOGLE_WEB_CLIENT_ID.trim();
  const iosClientId = GOOGLE_IOS_CLIENT_ID.trim();
  const attempts: BackendClientType[] = [];

  if (aud && aud === webClientId) {
    attempts.push('web');
  }
  if (aud && aud === iosClientId) {
    attempts.push('ios');
  }

  if (Platform.OS === 'ios') {
    attempts.push('ios');
  } else if (Platform.OS === 'android') {
    attempts.push('android');
  }

  if (attempts.length === 0) {
    attempts.push('web');
  }

  return [...new Set(attempts)];
}

function isRetryableGoogleAuthError(error: BackendApiError): boolean {
  if (error.code === 'INVALID_GOOGLE_TOKEN') {
    return true;
  }

  return (
    error.code === 'INVALID_REQUEST' &&
    error.message.toLowerCase().includes('not configured')
  );
}

function buildGoogleAuthConfigError(idToken: string): BackendApiError {
  const aud = decodeJwtClaims(idToken)?.aud ?? 'unknown';

  return new BackendApiError(
    400,
    'BACKEND_GOOGLE_AUTH_MISCONFIGURED',
    `Backend rejected Google sign-in: token audience is "${aud}" but the server has no matching Google client configured. Ask the backend operator to set GOOGLE_WEB_CLIENT_ID=${aud} (React Native idTokens use the web OAuth client as audience).`,
  );
}

async function obtainGoogleIdToken(): Promise<string> {
  console.log(`${AUTH_LOG_PREFIX} refreshing Google session (signInSilently)`);
  const silent = await GoogleSignin.signInSilently();

  if (silent.type === 'success' && silent.data.idToken) {
    console.log(`${AUTH_LOG_PREFIX} using idToken from signInSilently`);
    logIdTokenClaims(silent.data.idToken);
    return silent.data.idToken;
  }

  console.log(
    `${AUTH_LOG_PREFIX} signInSilently had no idToken, calling getTokens`,
  );
  const tokens = await GoogleSignin.getTokens();
  if (!tokens.idToken) {
    console.error(`${AUTH_LOG_PREFIX} Google idToken missing after getTokens`);
    throw new Error(
      'Google ID token is unavailable — sign out and sign in again from the Sign In screen',
    );
  }

  logIdTokenClaims(tokens.idToken);
  return tokens.idToken;
}

export async function loginWithGoogleIdToken(
  idToken: string,
): Promise<AuthTokenResponse> {
  logIdTokenClaims(idToken);

  const attempts = buildGoogleClientTypeAttempts(idToken);
  let lastError: BackendApiError | undefined;

  for (const clientType of attempts) {
    console.log(`${AUTH_LOG_PREFIX} POST /auth/google`, {
      api: getBackendApiUrl(),
      clientType,
      idTokenPresent: Boolean(idToken),
    });

    try {
      const response = await backendRequest<AuthTokenResponse>('/auth/google', {
        method: 'POST',
        body: { idToken, type: clientType },
        auth: false,
        retryOnUnauthorized: false,
      });

      await saveBackendSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      console.log(`${AUTH_LOG_PREFIX} session saved`, {
        userId: response.user.id,
        email: response.user.email,
        clientType,
      });

      return response;
    } catch (error) {
      if (
        error instanceof BackendApiError &&
        isRetryableGoogleAuthError(error)
      ) {
        console.warn(
          `${AUTH_LOG_PREFIX} /auth/google failed for type=${clientType}`,
          {
            code: error.code,
            message: error.message,
          },
        );
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw buildGoogleAuthConfigError(idToken) ?? lastError;
}

// Obtain a fresh Google idToken and exchange it for backend JWTs.
export async function ensureBackendSession(): Promise<AuthTokenResponse> {
  const idToken = await obtainGoogleIdToken();
  return loginWithGoogleIdToken(idToken);
}

export async function clearBackendAuth(): Promise<void> {
  await clearBackendSession();
}
