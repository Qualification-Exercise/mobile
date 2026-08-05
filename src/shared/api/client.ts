import { getBackendApiUrl } from '@shared/config/backend';
import {
  loadBackendSession,
  saveBackendSession,
} from '@shared/lib/backendAuthStorage';
import {
  headersFromFetchResponse,
  logNetworkRequest,
  logNetworkResponse,
  readResponseBodyText,
  redactBody,
} from './networkLog';
import type { BackendApiErrorBody } from './types';
import { BackendApiError } from './types';

const API_LOG_PREFIX = '[BackendAPI]';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

function logRequest(
  phase: 'start' | 'ok' | 'fail',
  method: string,
  path: string,
  extra?: Record<string, unknown>,
): void {
  const base = `${API_LOG_PREFIX} ${method} ${path}`;
  if (extra) {
    console.log(`${base} (${phase})`, extra);
    return;
  }
  console.log(`${base} (${phase})`);
}

function parseErrorFromBody(status: number, bodyText: string): BackendApiError {
  let code = 'UNKNOWN_ERROR';
  let message = `Request failed with status ${status}`;
  let details: Record<string, unknown> | undefined;

  try {
    const payload = JSON.parse(bodyText) as BackendApiErrorBody;
    if (payload.error) {
      code = payload.error.code;
      message = payload.error.message;
      details = payload.error.details;
    }
  } catch {
    if (bodyText.trim()) {
      message = bodyText.slice(0, 200);
    }
  }

  return new BackendApiError(status, code, message, details);
}

function parseSuccessBody<T>(bodyText: string, status: number): T {
  if (status === 204 || !bodyText.trim()) {
    return undefined as T;
  }

  return JSON.parse(bodyText) as T;
}

async function fetchWithNetworkLog(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<{ response: Response; bodyText: string }> {
  const serializedBody = body !== undefined ? JSON.stringify(body) : undefined;

  logNetworkRequest(
    method,
    url,
    headers,
    body !== undefined ? redactBody(body) : undefined,
  );

  const response = await fetch(url, {
    method,
    headers,
    body: serializedBody,
  });

  const bodyText = await readResponseBodyText(response);
  logNetworkResponse(
    method,
    url,
    response.status,
    headersFromFetchResponse(response),
    bodyText,
  );

  return { response, bodyText };
}

export async function backendRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = true,
    retryOnUnauthorized = true,
  } = options;

  const url = `${getBackendApiUrl()}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const session = await loadBackendSession();
    if (!session?.accessToken) {
      logRequest('fail', method, path, {
        reason: 'NO_BACKEND_SESSION',
        api: getBackendApiUrl(),
      });
      throw new BackendApiError(
        401,
        'NO_BACKEND_SESSION',
        'Backend session is not available',
      );
    }
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  logRequest('start', method, path, {
    auth,
    api: getBackendApiUrl(),
    hasBody: body !== undefined,
  });

  let response: Response;
  let bodyText: string;

  try {
    ({ response, bodyText } = await fetchWithNetworkLog(
      method,
      url,
      headers,
      body,
    ));
  } catch (error) {
    logRequest('fail', method, path, {
      reason: 'network',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  if (
    response.status === 401 &&
    auth &&
    retryOnUnauthorized &&
    path !== '/auth/refresh'
  ) {
    const session = await loadBackendSession();
    if (session?.refreshToken) {
      const refreshUrl = `${getBackendApiUrl()}/auth/refresh`;
      const refreshHeaders = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
      const refreshBody = { refreshToken: session.refreshToken };

      let refreshResponse: Response;
      let refreshBodyText: string;

      try {
        ({ response: refreshResponse, bodyText: refreshBodyText } =
          await fetchWithNetworkLog(
            'POST',
            refreshUrl,
            refreshHeaders,
            refreshBody,
          ));
      } catch (error) {
        logRequest('fail', method, path, {
          reason: 'refresh_network',
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      if (refreshResponse.ok) {
        const refreshed = parseSuccessBody<{
          accessToken: string;
          refreshToken: string;
        }>(refreshBodyText, refreshResponse.status);
        await saveBackendSession({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        });
        logRequest('ok', method, path, { refreshed: true, retry: true });
        return backendRequest<T>(path, {
          ...options,
          retryOnUnauthorized: false,
        });
      }

      logRequest('fail', method, path, {
        reason: 'refresh_failed',
        refreshStatus: refreshResponse.status,
      });
    }
  }

  if (!response.ok) {
    const apiError = parseErrorFromBody(response.status, bodyText);
    logRequest('fail', method, path, {
      status: apiError.status,
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    });
    throw apiError;
  }

  logRequest('ok', method, path, { status: response.status });

  return parseSuccessBody<T>(bodyText, response.status);
}
