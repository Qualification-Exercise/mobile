import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { apiBaseUrl } from '@shared/config';
import type { ApiErrorEnvelope, AuthTokens } from './types';

const REQUEST_TIMEOUT_MS = 15000;

// A 429 from the backend indexer is transient. Retry a bounded number of times,
// honoring the server's `Retry-After` when present and otherwise backing off
// with capped exponential delay plus jitter. Without this a rate-limited
// endpoint fails immediately and the caller is free to retry in a tight loop.
const MAX_429_RETRIES = 2;
const RETRY_BACKOFF_BASE_MS = 1000;
const RETRY_BACKOFF_CAP_MS = 15000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Milliseconds to wait before retrying a 429. Prefers the server's `Retry-After`
// header — either delta-seconds or an HTTP date — and falls back to capped
// exponential backoff with jitter. `attempt` is the number of retries already
// made (0 for the first retry).
function resolveRetryDelayMs(retryAfter: unknown, attempt: number): number {
  if (typeof retryAfter === 'string' && retryAfter.trim() !== '') {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(seconds, 0) * 1000, RETRY_BACKOFF_CAP_MS);
    }
    const dateMs = Date.parse(retryAfter);
    if (!Number.isNaN(dateMs)) {
      return Math.min(Math.max(dateMs - Date.now(), 0), RETRY_BACKOFF_CAP_MS);
    }
  }
  const backoff = Math.min(
    RETRY_BACKOFF_BASE_MS * 2 ** attempt,
    RETRY_BACKOFF_CAP_MS,
  );
  return backoff + Math.random() * RETRY_BACKOFF_BASE_MS;
}

// This is the list of endpoints where a 401 should be returned to the
// caller as-is, instead of triggering our "token expired → refresh → retry"
// logic (in the response interceptor at the bottom of this file).
//
// Two endpoints are exempt, each for its own reason:
//
//   '/auth/refresh' — this IS the refresh call. If it returns 401 (the refresh
//   token is expired/invalid), trying to fix that by calling refresh again would
//   just 401 again, forever. So a 401 here means "session is truly dead" and
//   must bubble up so the user gets signed out.
//
//   '/auth/google'  — this is the initial login, before any session exists. A
//   401 here means the login itself failed (bad idToken), not an expired access
//   token — there is nothing to refresh, so retrying makes no sense.
//
// For every OTHER endpoint, a 401 is assumed to mean "the access token expired",
// which is the case worth auto-recovering from by refreshing and retrying once.
const AUTH_EXEMPT_PATHS = ['/auth/refresh', '/auth/google'];

type AuthBridge = {
  getAccessToken: () => string | null;
  refreshTokens: () => Promise<AuthTokens>;
  onTokensRefreshed: (tokens: AuthTokens) => void;
  onAuthFailure: () => void;
};

let authBridge: AuthBridge | null = null;

export function configureAuth(bridge: AuthBridge): void {
  authBridge = bridge;
}

export class ApiError extends Error {
  readonly statusCode?: number;
  readonly errorCode?: string;

  constructor(message: string, statusCode?: number, errorCode?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiErrorEnvelope | undefined;
    const message = envelope?.message ?? error.message;
    return new ApiError(message, error.response?.status, envelope?.error);
  }

  return new ApiError(error instanceof Error ? error.message : 'Unknown error');
}

export const httpClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authBridge?.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// It is a "lock" that holds the currently-running refresh call.
// Imagine 3 requests fire at once and all get a 401 because the access token
// just expired. Without this, each would independently call /auth/refresh — 3
// refreshes, and the last two would use an already-rotated token. Instead, the
// first 401 stores its refresh Promise here; the other two see it is not null
// and await the SAME Promise rather than starting their own. When the refresh
// settles, `.finally` resets it to null so the next expiry can refresh again.
// In short: "if a refresh is already happening, wait for it instead of starting
// another."
let refreshPromise: Promise<AuthTokens> | null = null;

function runSharedRefresh(bridge: AuthBridge): Promise<AuthTokens> {
  if (!refreshPromise) {
    refreshPromise = bridge
      .refreshTokens()
      .then(tokens => {
        bridge.onTokensRefreshed(tokens);
        return tokens;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function isAuthExempt(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return AUTH_EXEMPT_PATHS.some(path => url.includes(path));
}

httpClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const bridge = authBridge;
    const original = error.config as
      | (InternalAxiosRequestConfig & {
          _retried?: boolean;
          _retry429Count?: number;
        })
      | undefined;

    // Transient rate-limit: wait out the backoff and retry before surfacing it.
    if (original != null && error.response?.status === 429) {
      const attempt = original._retry429Count ?? 0;
      if (attempt < MAX_429_RETRIES) {
        original._retry429Count = attempt + 1;
        const headers = error.response.headers as
          | Record<string, unknown>
          | undefined;
        await sleep(resolveRetryDelayMs(headers?.['retry-after'], attempt));
        return httpClient(original as AxiosRequestConfig);
      }
    }

    const canRetry =
      bridge != null &&
      original != null &&
      !original._retried &&
      error.response?.status === 401 &&
      !isAuthExempt(original.url);

    if (!canRetry) {
      return Promise.reject(toApiError(error));
    }

    original._retried = true;

    try {
      const tokens = await runSharedRefresh(bridge);
      original.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return httpClient(original as AxiosRequestConfig);
    } catch (refreshError) {
      bridge.onAuthFailure();
      return Promise.reject(toApiError(refreshError));
    }
  },
);
