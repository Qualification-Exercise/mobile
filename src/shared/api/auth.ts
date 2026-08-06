import axios from 'axios';
import { apiBaseUrl } from '@shared/config';
import { httpClient, toApiError } from './httpClient';
import type { AuthTokens, EClientType } from './types';

// A bare axios instance with no interceptors. Refresh must not go through
// `httpClient`, whose 401 interceptor would recurse into another refresh.
const bareClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const authApi = {
  // Exchange a Google `idToken` for a WDK session. Runs through `httpClient`,
  // but `/auth/google` is exempt from the refresh interceptor.
  async google(idToken: string, type: EClientType): Promise<AuthTokens> {
    try {
      const { data } = await httpClient.post<AuthTokens>('/auth/google', {
        idToken,
        type,
      });
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Exchange a refresh token for a fresh token bundle. Uses the bare client to
  // avoid the auth interceptor / refresh recursion.
  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const { data } = await bareClient.post<AuthTokens>('/auth/refresh', {
        refreshToken,
      });
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
