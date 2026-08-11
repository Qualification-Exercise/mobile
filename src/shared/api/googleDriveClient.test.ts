import type { AxiosInstance, AxiosResponse } from 'axios';
import {
  GoogleDriveClient,
  GOOGLE_DRIVE_APP_DATA_SCOPE,
  type GoogleSignInAuthorizationClient,
} from './googleDriveClient';
import {
  DRIVE_KEY_ENVELOPE_FILE_NAME,
  MAX_DRIVE_KEY_ENVELOPE_BYTES,
  serializeDriveKeyEnvelope,
  type DriveKeyEnvelopeV1,
} from '@shared/lib/driveKeyEnvelope';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {},
  isErrorWithCode: (error: unknown) =>
    typeof error === 'object' && error != null && 'code' in error,
  statusCodes: {
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  },
}));

const ENVELOPE: DriveKeyEnvelopeV1 = {
  schemaVersion: 1,
  encryptionKey: Buffer.alloc(32, 7).toString('base64'),
};
const SERIALIZED_ENVELOPE = serializeDriveKeyEnvelope(ENVELOPE);
const LEGACY_SERIALIZED_ENVELOPE = JSON.stringify({
  schemaVersion: 1,
  encryptedSeedSha256: 'a'.repeat(64),
  encryptedEntropySha256: 'b'.repeat(64),
  encryptionKey: ENVELOPE.encryptionKey,
});

function success(scopes: string[]) {
  return { type: 'success' as const, data: { scopes } };
}

function response(
  status: number,
  data = '',
  headers: Record<string, string> = {},
): AxiosResponse<string> {
  return { status, data, headers } as unknown as AxiosResponse<string>;
}

function listBody(
  files: Array<{ id: string; size?: number }> = [],
  nextPageToken?: string,
): string {
  return JSON.stringify({
    files: files.map(file => ({
      id: file.id,
      name: DRIVE_KEY_ENVELOPE_FILE_NAME,
      size: String(file.size ?? SERIALIZED_ENVELOPE.length),
    })),
    ...(nextPageToken ? { nextPageToken } : {}),
  });
}

// A sign-in client that authorizes cleanly and hands out a rotating access
// token so a 401 retry can be observed switching from `token-1` to `token-2`.
function createSignInClient(): jest.Mocked<GoogleSignInAuthorizationClient> {
  let token = 'token-1';
  return {
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signInSilently: jest.fn().mockResolvedValue(success([])),
    addScopes: jest
      .fn()
      .mockResolvedValue(success([GOOGLE_DRIVE_APP_DATA_SCOPE])),
    getTokens: jest.fn(async () => ({ accessToken: token })),
    clearCachedAccessToken: jest.fn(async () => {
      token = 'token-2';
    }),
  } as unknown as jest.Mocked<GoogleSignInAuthorizationClient>;
}

function createHttp(
  ...responses: AxiosResponse<string>[]
): jest.Mocked<AxiosInstance> {
  const request = jest.fn();
  for (const item of responses) {
    request.mockResolvedValueOnce(item);
  }
  return { request } as unknown as jest.Mocked<AxiosInstance>;
}

describe('Google Drive key storage', () => {
  test('enumerates every page and downloads the singleton envelope', async () => {
    const http = createHttp(
      response(200, listBody([], 'next-page')),
      response(200, listBody([{ id: 'file-1' }])),
      response(200, SERIALIZED_ENVELOPE),
    );
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await expect(provider.getEncryptionKey()).resolves.toEqual({
      status: 'found',
      encryptionKey: ENVELOPE.encryptionKey,
    });
    expect(http.request).toHaveBeenCalledTimes(3);
    expect(http.request.mock.calls[1][0].url).toContain('pageToken=next-page');
    expect(http.request.mock.calls[2][0].url).toContain(
      '/files/file-1?alt=media',
    );
    expect(http.request.mock.calls[0][0].url).toContain('spaces=appDataFolder');
  });

  test('returns not found when the singleton file is absent', async () => {
    const provider = new GoogleDriveClient(
      createSignInClient(),
      createHttp(response(200, listBody())),
    );

    await expect(provider.getEncryptionKey()).resolves.toEqual({
      status: 'not_found',
    });
  });

  test('creates a missing file in appDataFolder with multipart upload', async () => {
    const http = createHttp(
      response(200, listBody()),
      response(200, JSON.stringify({ id: 'created' })),
    );
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await provider.putEncryptionKey(ENVELOPE.encryptionKey);

    const config = http.request.mock.calls[1][0];
    expect(config.url).toContain('/upload/drive/v3/files?uploadType=multipart');
    expect(config.method).toBe('post');
    expect(config.data).toContain('"parents":["appDataFolder"]');
    expect(config.data).toContain(SERIALIZED_ENVELOPE);
  });

  test('updates the existing singleton file instead of creating another', async () => {
    const http = createHttp(
      response(200, listBody([{ id: 'existing' }])),
      response(200),
    );
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await provider.putEncryptionKey(ENVELOPE.encryptionKey);

    const config = http.request.mock.calls[1][0];
    expect(config.url).toContain(
      '/upload/drive/v3/files/existing?uploadType=media',
    );
    expect(config).toMatchObject({
      method: 'patch',
      data: SERIALIZED_ENVELOPE,
    });
  });

  test('validates duplicate files before updating every copy', async () => {
    const http = createHttp(
      response(200, listBody([{ id: 'one' }, { id: 'two' }])),
      response(200, SERIALIZED_ENVELOPE),
      response(200, SERIALIZED_ENVELOPE),
      response(200),
      response(200),
    );
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await provider.putEncryptionKey(ENVELOPE.encryptionKey);

    expect(http.request).toHaveBeenCalledTimes(5);
    expect(http.request.mock.calls[3][0].method).toBe('patch');
    expect(http.request.mock.calls[4][0].method).toBe('patch');
  });

  test('rejects an invalid encryption key before sending a request', async () => {
    const http = createHttp();
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await expect(provider.putEncryptionKey('invalid')).rejects.toMatchObject({
      code: 'invalid_response',
    });
    expect(http.request).not.toHaveBeenCalled();
  });

  test('accepts byte-identical duplicate files as one logical envelope', async () => {
    const http = createHttp(
      response(200, listBody([{ id: 'one' }, { id: 'two' }])),
      response(200, SERIALIZED_ENVELOPE),
      response(200, SERIALIZED_ENVELOPE),
    );
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await expect(provider.getEncryptionKey()).resolves.toEqual({
      status: 'found',
      encryptionKey: ENVELOPE.encryptionKey,
    });
  });

  test('treats old and current files with the same key as one logical envelope', async () => {
    const http = createHttp(
      response(200, listBody([{ id: 'old' }, { id: 'current' }])),
      response(200, LEGACY_SERIALIZED_ENVELOPE),
      response(200, SERIALIZED_ENVELOPE),
    );
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await expect(provider.getEncryptionKey()).resolves.toEqual({
      status: 'found',
      encryptionKey: ENVELOPE.encryptionKey,
    });
  });

  test('rejects conflicting duplicate files instead of selecting one', async () => {
    const changed = serializeDriveKeyEnvelope({
      ...ENVELOPE,
      encryptionKey: Buffer.alloc(32, 8).toString('base64'),
    });
    const http = createHttp(
      response(200, listBody([{ id: 'one' }, { id: 'two' }])),
      response(200, SERIALIZED_ENVELOPE),
      response(200, changed),
    );
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await expect(provider.getEncryptionKey()).rejects.toMatchObject({
      code: 'remote_invariant',
    });
  });

  test.each([
    ['malformed content', listBody([{ id: 'file' }]), '{', 'invalid_response'],
    [
      'oversized metadata',
      listBody([{ id: 'file', size: MAX_DRIVE_KEY_ENVELOPE_BYTES + 1 }]),
      '',
      'response_too_large',
    ],
    [
      'oversized downloaded content',
      listBody([{ id: 'file', size: 1 }]),
      'x'.repeat(MAX_DRIVE_KEY_ENVELOPE_BYTES + 1),
      'response_too_large',
    ],
  ])('rejects %s safely', async (_, listing, content, code) => {
    const http = createHttp(response(200, listing), response(200, content));
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await expect(provider.getEncryptionKey()).rejects.toMatchObject({ code });
  });

  test('bounds pagination even when Drive keeps returning page tokens', async () => {
    const http = createHttp(
      ...Array.from({ length: 10 }, (_, index) =>
        response(200, listBody([], `page-${index}`)),
      ),
    );
    const provider = new GoogleDriveClient(createSignInClient(), http);

    await expect(provider.getEncryptionKey()).rejects.toMatchObject({
      code: 'invalid_response',
    });
    expect(http.request).toHaveBeenCalledTimes(10);
  });

  test('rejects more matching files than the singleton invariant permits', async () => {
    const files = Array.from({ length: 21 }, (_, index) => ({
      id: `file-${index}`,
    }));
    const provider = new GoogleDriveClient(
      createSignInClient(),
      createHttp(response(200, listBody(files))),
    );

    await expect(provider.getEncryptionKey()).rejects.toMatchObject({
      code: 'remote_invariant',
    });
  });

  test.each([
    ['malformed JSON', '{'],
    ['missing files', JSON.stringify({})],
    ['invalid page token', JSON.stringify({ files: [], nextPageToken: 42 })],
    ['invalid file metadata', JSON.stringify({ files: [null] })],
  ])('rejects a listing with %s', async (_, body) => {
    const provider = new GoogleDriveClient(
      createSignInClient(),
      createHttp(response(200, body)),
    );

    await expect(provider.getEncryptionKey()).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  test('rejects transport and non-success HTTP failures safely', async () => {
    const rejectedHttp = {
      request: jest.fn().mockRejectedValue(new Error('offline')),
    } as unknown as jest.Mocked<AxiosInstance>;

    await expect(
      new GoogleDriveClient(
        createSignInClient(),
        rejectedHttp,
      ).getEncryptionKey(),
    ).rejects.toMatchObject({ code: 'network_error' });
    await expect(
      new GoogleDriveClient(
        createSignInClient(),
        createHttp(response(500)),
      ).getEncryptionKey(),
    ).rejects.toMatchObject({ code: 'network_error' });
  });

  test('rejects a response whose declared content length is too large', async () => {
    const oversized = response(200, '', {
      'content-length': String(64 * 1024 + 1),
    });
    const provider = new GoogleDriveClient(
      createSignInClient(),
      createHttp(oversized),
    );

    await expect(provider.getEncryptionKey()).rejects.toMatchObject({
      code: 'response_too_large',
    });
  });

  test('measures multibyte response bodies in UTF-8 bytes', async () => {
    const provider = new GoogleDriveClient(
      createSignInClient(),
      createHttp(response(200, 'é€😀')),
    );

    await expect(provider.getEncryptionKey()).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });
});

describe('Google Drive access tokens', () => {
  test('clears the cached token and retries once after 401', async () => {
    const signIn = createSignInClient();
    const http = createHttp(response(401), response(200, listBody()));
    const provider = new GoogleDriveClient(signIn, http);

    await expect(provider.getEncryptionKey()).resolves.toEqual({
      status: 'not_found',
    });
    expect(signIn.clearCachedAccessToken).toHaveBeenCalledWith('token-1');
    expect(http.request.mock.calls[0][0].headers?.Authorization).toBe(
      'Bearer token-1',
    );
    expect(http.request.mock.calls[1][0].headers?.Authorization).toBe(
      'Bearer token-2',
    );
  });

  test('does not retry repeated 401 or a 403 as token expiry', async () => {
    const repeatedSignIn = createSignInClient();
    const repeatedProvider = new GoogleDriveClient(
      repeatedSignIn,
      createHttp(response(401), response(401)),
    );
    const deniedSignIn = createSignInClient();
    const deniedHttp = createHttp(response(403));
    const deniedProvider = new GoogleDriveClient(deniedSignIn, deniedHttp);

    await expect(repeatedProvider.getEncryptionKey()).rejects.toMatchObject({
      code: 'unauthorized',
    });
    expect(repeatedSignIn.clearCachedAccessToken).toHaveBeenCalledTimes(1);
    await expect(deniedProvider.getEncryptionKey()).rejects.toMatchObject({
      code: 'permission_denied',
    });
    expect(deniedSignIn.clearCachedAccessToken).not.toHaveBeenCalled();
    expect(deniedHttp.request).toHaveBeenCalledTimes(1);
  });

  test('deduplicates concurrent access-token retrieval', async () => {
    const signIn = createSignInClient();
    let releaseToken!: (value: { accessToken: string }) => void;
    signIn.getTokens.mockImplementation(
      () =>
        new Promise(resolve => {
          releaseToken = resolve;
        }),
    );
    const provider = new GoogleDriveClient(
      signIn,
      createHttp(response(200, listBody()), response(200, listBody())),
    );

    const first = provider.getEncryptionKey();
    const second = provider.getEncryptionKey();
    await Promise.resolve();
    expect(releaseToken).toBeDefined();
    releaseToken({ accessToken: 'drive-token' });

    await Promise.all([first, second]);
    expect(signIn.getTokens).toHaveBeenCalledTimes(1);
  });

  test('keeps the access token out of the client instance state', async () => {
    const signIn = createSignInClient();
    signIn.getTokens.mockResolvedValue({ accessToken: 'sensitive-token' });
    const provider = new GoogleDriveClient(
      signIn,
      createHttp(response(200, listBody())),
    );

    await provider.getEncryptionKey();

    expect(JSON.stringify(provider)).not.toContain('sensitive-token');
  });

  test('reports token_unavailable without leaking native token errors', async () => {
    const rejectedDetail = 'native-token-detail';
    const signIn = createSignInClient();
    signIn.getTokens.mockRejectedValue(new Error(rejectedDetail));
    const provider = new GoogleDriveClient(signIn, createHttp());

    let caught: unknown;
    try {
      await provider.getEncryptionKey();
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: 'token_unavailable' });
    expect(`${String(caught)} ${JSON.stringify(caught)}`).not.toContain(
      rejectedDetail,
    );
  });

  test('rejects an empty access token before making a request', async () => {
    const signIn = createSignInClient();
    signIn.getTokens.mockResolvedValue({ accessToken: '' });
    const http = createHttp();

    await expect(
      new GoogleDriveClient(signIn, http).getEncryptionKey(),
    ).rejects.toMatchObject({ code: 'token_unavailable' });
    expect(http.request).not.toHaveBeenCalled();
  });

  test('reports token_unavailable when clearing the cached token fails', async () => {
    const signIn = createSignInClient();
    signIn.clearCachedAccessToken.mockRejectedValue(new Error('native'));
    const provider = new GoogleDriveClient(signIn, createHttp(response(401)));

    await expect(provider.getEncryptionKey()).rejects.toMatchObject({
      code: 'token_unavailable',
    });
  });
});

describe('Google Drive authorization', () => {
  test('requests only the appDataFolder scope incrementally', async () => {
    const signIn = createSignInClient();
    const provider = new GoogleDriveClient(signIn, createHttp());

    await expect(provider.authorize(true)).resolves.toEqual({
      status: 'authorized',
    });
    expect(signIn.addScopes).toHaveBeenCalledWith({
      scopes: [GOOGLE_DRIVE_APP_DATA_SCOPE],
    });
  });

  test('does not prompt when Drive access is already granted', async () => {
    const signIn = createSignInClient();
    signIn.signInSilently.mockResolvedValue(
      success(['profile', GOOGLE_DRIVE_APP_DATA_SCOPE]),
    );
    const provider = new GoogleDriveClient(signIn, createHttp());

    await expect(provider.authorize(true)).resolves.toEqual({
      status: 'authorized',
    });
    expect(signIn.addScopes).not.toHaveBeenCalled();
  });

  test('reports denied without prompting during a noninteractive check', async () => {
    const signIn = createSignInClient();
    const provider = new GoogleDriveClient(signIn, createHttp());

    await expect(provider.authorize(false)).resolves.toEqual({
      status: 'denied',
    });
    expect(signIn.addScopes).not.toHaveBeenCalled();
    expect(signIn.hasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: false,
    });
  });

  test('distinguishes cancellation from a completed denial', async () => {
    const cancelledSignIn = createSignInClient();
    cancelledSignIn.addScopes.mockResolvedValue({
      type: 'cancelled',
      data: null,
    });
    const deniedSignIn = createSignInClient();
    deniedSignIn.addScopes.mockResolvedValue(success(['profile']));

    await expect(
      new GoogleDriveClient(cancelledSignIn, createHttp()).authorize(true),
    ).resolves.toEqual({ status: 'cancelled' });
    await expect(
      new GoogleDriveClient(deniedSignIn, createHttp()).authorize(true),
    ).resolves.toEqual({ status: 'denied' });
  });

  test('reports signed-out state before requesting scopes', async () => {
    const signIn = createSignInClient();
    signIn.signInSilently.mockResolvedValue({
      type: 'noSavedCredentialFound',
      data: null,
    });
    const provider = new GoogleDriveClient(signIn, createHttp());

    await expect(provider.authorize(true)).resolves.toEqual({
      status: 'signed_out',
    });
    expect(signIn.addScopes).not.toHaveBeenCalled();
  });

  test.each([
    ['an unavailable result', false, undefined],
    [
      'the native unavailable error',
      true,
      Object.assign(new Error('native detail'), {
        code: 'PLAY_SERVICES_NOT_AVAILABLE',
      }),
    ],
  ])('reports unavailable services from %s', async (_, available, error) => {
    const signIn = createSignInClient();
    if (error) {
      signIn.hasPlayServices.mockRejectedValue(error);
    } else {
      signIn.hasPlayServices.mockResolvedValue(available as boolean);
    }
    const provider = new GoogleDriveClient(signIn, createHttp());

    await expect(provider.authorize(true)).resolves.toEqual({
      status: 'unavailable',
    });
  });

  test('throws a safe typed error for an unexpected native failure', async () => {
    const rejectedDetail = 'provider-secret-detail';
    const signIn = createSignInClient();
    signIn.addScopes.mockRejectedValue(new Error(rejectedDetail));
    const provider = new GoogleDriveClient(signIn, createHttp());

    let caught: unknown;
    try {
      await provider.authorize(true);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: 'authorization_failed' });
    expect(`${String(caught)} ${JSON.stringify(caught)}`).not.toContain(
      rejectedDetail,
    );
  });

  test('deduplicates concurrent interactive authorization calls', async () => {
    const signIn = createSignInClient();
    let finishSilentSignIn!: (value: ReturnType<typeof success>) => void;
    signIn.signInSilently.mockImplementation(
      () =>
        new Promise(resolve => {
          finishSilentSignIn = resolve;
        }),
    );
    const provider = new GoogleDriveClient(signIn, createHttp());

    const first = provider.authorize(true);
    const second = provider.authorize(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(finishSilentSignIn).toBeDefined();
    finishSilentSignIn(success([]));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'authorized' },
      { status: 'authorized' },
    ]);
    expect(signIn.signInSilently).toHaveBeenCalledTimes(1);
    expect(signIn.addScopes).toHaveBeenCalledTimes(1);
  });

  test('deduplicates concurrent noninteractive authorization checks', async () => {
    const signIn = createSignInClient();
    let finishSilentSignIn!: (value: ReturnType<typeof success>) => void;
    signIn.signInSilently.mockImplementation(
      () =>
        new Promise(resolve => {
          finishSilentSignIn = resolve;
        }),
    );
    const provider = new GoogleDriveClient(signIn, createHttp());

    const first = provider.authorize(false);
    const second = provider.authorize(false);
    await Promise.resolve();
    await Promise.resolve();
    finishSilentSignIn(success([]));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'denied' },
      { status: 'denied' },
    ]);
    expect(signIn.signInSilently).toHaveBeenCalledTimes(1);
  });

  test('upgrades an in-flight silent denial to an interactive request', async () => {
    const signIn = createSignInClient();
    let finishSilentSignIn!: (value: ReturnType<typeof success>) => void;
    signIn.signInSilently
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishSilentSignIn = resolve;
          }),
      )
      .mockResolvedValue(success([]));
    const provider = new GoogleDriveClient(signIn, createHttp());

    const silent = provider.authorize(false);
    const interactive = provider.authorize(true);
    await Promise.resolve();
    await Promise.resolve();
    finishSilentSignIn(success([]));

    await expect(silent).resolves.toEqual({ status: 'denied' });
    await expect(interactive).resolves.toEqual({ status: 'authorized' });
    expect(signIn.signInSilently).toHaveBeenCalledTimes(2);
    expect(signIn.addScopes).toHaveBeenCalledTimes(1);
  });

  test('treats an empty scope response as signed out', async () => {
    const signIn = createSignInClient();
    signIn.addScopes.mockResolvedValue(null);

    await expect(
      new GoogleDriveClient(signIn, createHttp()).authorize(true),
    ).resolves.toEqual({ status: 'signed_out' });
  });

  test.each([
    ['SIGN_IN_REQUIRED', 'signed_out'],
    ['SIGN_IN_CANCELLED', 'cancelled'],
  ] as const)('maps native %s errors to %s', async (code, status) => {
    const signIn = createSignInClient();
    signIn.signInSilently.mockRejectedValue(
      Object.assign(new Error('native detail'), { code }),
    );

    await expect(
      new GoogleDriveClient(signIn, createHttp()).authorize(true),
    ).resolves.toEqual({ status });
  });
});
