import { AxiosError, type AxiosResponse } from 'axios';
import type { AuthTokens } from './types';
import { ApiError, configureAuth, httpClient, toApiError } from './httpClient';

const tokens: AuthTokens = {
  accessToken: 'fresh-access',
  refreshToken: 'r',
  user: { id: 'u1', email: null, firstName: null, lastName: null },
};

// A stateful bridge that mirrors the real store: a successful refresh updates
// the token that `getAccessToken` returns, so a retry picks up the fresh one.
function makeBridge(
  overrides: Partial<Parameters<typeof configureAuth>[0]> = {},
) {
  let access = 'stale-access';
  const bridge = {
    getAccessToken: jest.fn(() => access),
    refreshTokens: jest.fn().mockResolvedValue(tokens),
    onTokensRefreshed: jest.fn((t: AuthTokens) => {
      access = t.accessToken;
    }),
    onAuthFailure: jest.fn(),
    ...overrides,
  };
  configureAuth(bridge);
  return bridge;
}

function ok(config: AxiosError['config']): AxiosResponse {
  return {
    data: { authHeader: config?.headers?.get?.('Authorization') ?? null },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: config!,
  };
}

function httpError(status: number, config: AxiosError['config']): AxiosError {
  return new AxiosError('failed', 'ERR', config, null, {
    status,
    data: { message: 'expired', error: 'TOKEN_EXPIRED' },
    statusText: 'Error',
    headers: {},
    config: config!,
  });
}

// Adapter that fails the first attempt with `status`, then succeeds on retry
// (the interceptor sets `_retried` on the config it replays).
function failThenOk(status: number) {
  return jest.fn(async (config: any) => {
    if (!config._retried) {
      throw httpError(status, config);
    }
    return ok(config);
  });
}

describe('ApiError / toApiError', () => {
  it('passes an existing ApiError through', () => {
    const err = new ApiError('x', 400, 'CODE');
    expect(toApiError(err)).toBe(err);
  });

  it('reads message/status/code from an axios error envelope', () => {
    const err = new AxiosError('network', 'ERR', undefined, null, {
      status: 400,
      data: { message: 'bad input', error: 'VALIDATION' },
      statusText: 'Bad Request',
      headers: {},
      config: {} as any,
    });
    const api = toApiError(err);
    expect(api).toMatchObject({
      message: 'bad input',
      statusCode: 400,
      errorCode: 'VALIDATION',
    });
  });

  it('falls back to a generic message for a non-error value', () => {
    expect(toApiError('oops').message).toBe('Unknown error');
  });
});

describe('httpClient auth interceptors', () => {
  it('attaches the access token when one is available', async () => {
    makeBridge({ getAccessToken: jest.fn().mockReturnValue('tok-1') });
    httpClient.defaults.adapter = jest.fn(async (config: any) => ok(config));

    const res = await httpClient.get('/coupons');
    expect(res.data.authHeader).toBe('Bearer tok-1');
  });

  it('sends no Authorization header when there is no token', async () => {
    makeBridge({ getAccessToken: jest.fn().mockReturnValue(null) });
    httpClient.defaults.adapter = jest.fn(async (config: any) => ok(config));

    const res = await httpClient.get('/pricing/live');
    expect(res.data.authHeader).toBeNull();
  });

  it('refreshes once on a 401 and retries with the new token', async () => {
    const bridge = makeBridge();
    httpClient.defaults.adapter = failThenOk(401);

    const res = await httpClient.get('/coupons');
    expect(bridge.refreshTokens).toHaveBeenCalledTimes(1);
    expect(bridge.onTokensRefreshed).toHaveBeenCalledWith(tokens);
    expect(res.data.authHeader).toBe('Bearer fresh-access');
  });

  it('shares a single refresh across concurrent 401s', async () => {
    const bridge = makeBridge();
    httpClient.defaults.adapter = failThenOk(401);

    await Promise.all([
      httpClient.get('/coupons'),
      httpClient.get('/transactions'),
      httpClient.get('/wallets'),
    ]);
    expect(bridge.refreshTokens).toHaveBeenCalledTimes(1);
  });

  it('signs out when the refresh itself fails', async () => {
    const bridge = makeBridge({
      refreshTokens: jest.fn().mockRejectedValue(new Error('dead')),
    });
    httpClient.defaults.adapter = failThenOk(401);

    await expect(httpClient.get('/coupons')).rejects.toBeInstanceOf(ApiError);
    expect(bridge.onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('does not refresh on the exempt auth endpoints', async () => {
    const bridge = makeBridge();
    httpClient.defaults.adapter = failThenOk(401);

    await expect(httpClient.post('/auth/refresh', {})).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(bridge.refreshTokens).not.toHaveBeenCalled();
  });

  it('passes non-401 errors straight through', async () => {
    const bridge = makeBridge();
    httpClient.defaults.adapter = failThenOk(500);

    await expect(httpClient.get('/coupons')).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(bridge.refreshTokens).not.toHaveBeenCalled();
  });
});

// A 429 adapter that fails until `_retry429Count` reaches `until`, honoring an
// optional Retry-After header on the error response.
function rateLimited(until: number, retryAfter?: string) {
  return jest.fn(async (config: any) => {
    if ((config._retry429Count ?? 0) < until) {
      const err = httpError(429, config);
      if (retryAfter !== undefined) {
        err.response!.headers = { 'retry-after': retryAfter } as any;
      }
      throw err;
    }
    return ok(config);
  });
}

describe('httpClient 429 handling', () => {
  beforeEach(() => {
    makeBridge();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('waits out a numeric Retry-After and retries', async () => {
    httpClient.defaults.adapter = rateLimited(1, '0');
    const p = httpClient.get('/coupons');
    await jest.runAllTimersAsync();
    await expect(p).resolves.toMatchObject({ status: 200 });
  });

  it('honors an HTTP-date Retry-After', async () => {
    httpClient.defaults.adapter = rateLimited(
      1,
      'Wed, 01 Jan 2020 00:00:00 GMT',
    );
    const p = httpClient.get('/coupons');
    await jest.runAllTimersAsync();
    await expect(p).resolves.toMatchObject({ status: 200 });
  });

  it('backs off when no Retry-After header is present', async () => {
    httpClient.defaults.adapter = rateLimited(1);
    const p = httpClient.get('/coupons');
    await jest.runAllTimersAsync();
    await expect(p).resolves.toMatchObject({ status: 200 });
  });

  it('gives up after the retry budget is exhausted', async () => {
    httpClient.defaults.adapter = rateLimited(Infinity);
    // Capture the rejection up front so it is never momentarily unhandled while
    // fake timers advance the backoff waits.
    const settled = httpClient.get('/coupons').catch(error => error);
    await jest.runAllTimersAsync();
    expect(await settled).toMatchObject({ statusCode: 429 });
  });
});
