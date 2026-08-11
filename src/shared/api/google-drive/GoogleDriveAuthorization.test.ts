import {
  GOOGLE_DRIVE_APP_DATA_SCOPE,
  GoogleDriveAuthorization,
  type GoogleSignInAuthorizationClient,
} from './GoogleDriveAuthorization';

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

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
  digestStringAsync: jest.fn(),
}));

function success(scopes: string[]) {
  return {
    type: 'success' as const,
    data: { scopes },
  };
}

function createClient(): jest.Mocked<GoogleSignInAuthorizationClient> {
  return {
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signInSilently: jest.fn().mockResolvedValue(success([])),
    addScopes: jest
      .fn()
      .mockResolvedValue(success([GOOGLE_DRIVE_APP_DATA_SCOPE])),
    getTokens: jest.fn().mockResolvedValue({ accessToken: 'drive-token' }),
    clearCachedAccessToken: jest.fn().mockResolvedValue(null),
  };
}

describe('Google Drive authorization', () => {
  it('requests only the appDataFolder scope incrementally', async () => {
    const client = createClient();
    const authorization = new GoogleDriveAuthorization(client);

    await expect(authorization.authorize(true)).resolves.toEqual({
      status: 'authorized',
    });
    expect(client.addScopes).toHaveBeenCalledWith({
      scopes: [GOOGLE_DRIVE_APP_DATA_SCOPE],
    });
  });

  it('does not prompt when Drive access is already granted', async () => {
    const client = createClient();
    client.signInSilently.mockResolvedValue(
      success(['profile', GOOGLE_DRIVE_APP_DATA_SCOPE]),
    );
    const authorization = new GoogleDriveAuthorization(client);

    await expect(authorization.authorize(true)).resolves.toEqual({
      status: 'authorized',
    });
    expect(client.addScopes).not.toHaveBeenCalled();
  });

  it('reports denied without prompting during a noninteractive check', async () => {
    const client = createClient();
    const authorization = new GoogleDriveAuthorization(client);

    await expect(authorization.authorize(false)).resolves.toEqual({
      status: 'denied',
    });
    expect(client.addScopes).not.toHaveBeenCalled();
    expect(client.hasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: false,
    });
  });

  it('distinguishes cancellation from a completed denial', async () => {
    const cancelledClient = createClient();
    cancelledClient.addScopes.mockResolvedValue({
      type: 'cancelled',
      data: null,
    });
    const deniedClient = createClient();
    deniedClient.addScopes.mockResolvedValue(success(['profile']));

    await expect(
      new GoogleDriveAuthorization(cancelledClient).authorize(true),
    ).resolves.toEqual({ status: 'cancelled' });
    await expect(
      new GoogleDriveAuthorization(deniedClient).authorize(true),
    ).resolves.toEqual({ status: 'denied' });
  });

  it('reports signed-out state before requesting scopes', async () => {
    const client = createClient();
    client.signInSilently.mockResolvedValue({
      type: 'noSavedCredentialFound',
      data: null,
    });
    const authorization = new GoogleDriveAuthorization(client);

    await expect(authorization.authorize(true)).resolves.toEqual({
      status: 'signed_out',
    });
    expect(client.addScopes).not.toHaveBeenCalled();
  });

  it.each([
    ['an unavailable result', false, undefined],
    [
      'the native unavailable error',
      true,
      Object.assign(new Error('native detail'), {
        code: 'PLAY_SERVICES_NOT_AVAILABLE',
      }),
    ],
  ])('reports unavailable services from %s', async (_, available, error) => {
    const client = createClient();
    if (error) {
      client.hasPlayServices.mockRejectedValue(error);
    } else {
      client.hasPlayServices.mockResolvedValue(available);
    }
    const authorization = new GoogleDriveAuthorization(client);

    await expect(authorization.authorize(true)).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('throws a safe typed error for an unexpected native failure', async () => {
    const rejectedDetail = 'provider-secret-detail';
    const client = createClient();
    client.addScopes.mockRejectedValue(new Error(rejectedDetail));
    const authorization = new GoogleDriveAuthorization(client);

    let caught: unknown;
    try {
      await authorization.authorize(true);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: 'authorization_failed' });
    expect(`${String(caught)} ${JSON.stringify(caught)}`).not.toContain(
      rejectedDetail,
    );
  });

  it('deduplicates concurrent interactive authorization calls', async () => {
    const client = createClient();
    let finishSilentSignIn!: (value: ReturnType<typeof success>) => void;
    client.signInSilently.mockImplementation(
      () =>
        new Promise(resolve => {
          finishSilentSignIn = resolve;
        }),
    );
    const authorization = new GoogleDriveAuthorization(client);

    const first = authorization.authorize(true);
    const second = authorization.authorize(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(finishSilentSignIn).toBeDefined();
    finishSilentSignIn(success([]));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'authorized' },
      { status: 'authorized' },
    ]);
    expect(client.signInSilently).toHaveBeenCalledTimes(1);
    expect(client.addScopes).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent noninteractive authorization checks', async () => {
    const client = createClient();
    let finishSilentSignIn!: (value: ReturnType<typeof success>) => void;
    client.signInSilently.mockImplementation(
      () =>
        new Promise(resolve => {
          finishSilentSignIn = resolve;
        }),
    );
    const authorization = new GoogleDriveAuthorization(client);

    const first = authorization.authorize(false);
    const second = authorization.authorize(false);
    await Promise.resolve();
    await Promise.resolve();
    finishSilentSignIn(success([]));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'denied' },
      { status: 'denied' },
    ]);
    expect(client.signInSilently).toHaveBeenCalledTimes(1);
  });

  it('upgrades an in-flight silent denial to an interactive request', async () => {
    const client = createClient();
    let finishSilentSignIn!: (value: ReturnType<typeof success>) => void;
    client.signInSilently
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishSilentSignIn = resolve;
          }),
      )
      .mockResolvedValue(success([]));
    const authorization = new GoogleDriveAuthorization(client);

    const silent = authorization.authorize(false);
    const interactive = authorization.authorize(true);
    await Promise.resolve();
    await Promise.resolve();
    finishSilentSignIn(success([]));

    await expect(silent).resolves.toEqual({ status: 'denied' });
    await expect(interactive).resolves.toEqual({ status: 'authorized' });
    expect(client.signInSilently).toHaveBeenCalledTimes(2);
    expect(client.addScopes).toHaveBeenCalledTimes(1);
  });

  it('treats an empty scope response as signed out', async () => {
    const client = createClient();
    client.addScopes.mockResolvedValue(null);

    await expect(
      new GoogleDriveAuthorization(client).authorize(true),
    ).resolves.toEqual({ status: 'signed_out' });
  });

  it.each([
    ['SIGN_IN_REQUIRED', 'signed_out'],
    ['SIGN_IN_CANCELLED', 'cancelled'],
  ] as const)('maps native %s errors to %s', async (code, status) => {
    const client = createClient();
    client.signInSilently.mockRejectedValue(
      Object.assign(new Error('native detail'), { code }),
    );

    await expect(
      new GoogleDriveAuthorization(client).authorize(true),
    ).resolves.toEqual({ status });
  });
});

describe('Google Drive access tokens', () => {
  it('deduplicates token retrieval and keeps the token out of adapter state', async () => {
    const accessToken = 'sensitive-drive-token';
    const client = createClient();
    client.getTokens.mockResolvedValue({ accessToken });
    const authorization = new GoogleDriveAuthorization(client);

    const results = await Promise.all([
      authorization.withAccessToken(async token => token.length),
      authorization.withAccessToken(async token =>
        token.startsWith('sensitive'),
      ),
    ]);

    expect(results).toEqual([accessToken.length, true]);
    expect(client.getTokens).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(authorization)).not.toContain(accessToken);
  });

  it('returns safe typed token errors without native details', async () => {
    const rejectedDetail = 'native-token-detail';
    const client = createClient();
    client.getTokens.mockRejectedValue(new Error(rejectedDetail));
    const authorization = new GoogleDriveAuthorization(client);

    let caught: unknown;
    try {
      await authorization.withAccessToken(async () => undefined);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: 'token_unavailable' });
    expect(`${String(caught)} ${JSON.stringify(caught)}`).not.toContain(
      rejectedDetail,
    );
  });

  it('clears the exact function-local cached token for a future retry', async () => {
    const client = createClient();
    const authorization = new GoogleDriveAuthorization(client);

    await authorization.withAccessToken(async token => {
      await authorization.clearCachedAccessToken(token);
    });

    expect(client.clearCachedAccessToken).toHaveBeenCalledWith('drive-token');
  });

  it('rejects empty tokens without invoking the operation', async () => {
    const client = createClient();
    client.getTokens.mockResolvedValue({ accessToken: '' });
    const operation = jest.fn();

    await expect(
      new GoogleDriveAuthorization(client).withAccessToken(operation),
    ).rejects.toMatchObject({ code: 'token_unavailable' });
    expect(operation).not.toHaveBeenCalled();
  });

  it.each(['empty input', 'native rejection'])(
    'reports token_unavailable when clearing fails from %s',
    async scenario => {
      const client = createClient();
      if (scenario === 'native rejection') {
        client.clearCachedAccessToken.mockRejectedValue(new Error('native'));
      }
      const authorization = new GoogleDriveAuthorization(client);

      await expect(
        authorization.clearCachedAccessToken(
          scenario === 'empty input' ? '' : 'drive-token',
        ),
      ).rejects.toMatchObject({ code: 'token_unavailable' });
    },
  );
});
