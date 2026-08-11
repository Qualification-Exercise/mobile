import {
  GoogleDriveKeyProvider,
  type DriveAuthorization,
  type DriveHttpResponse,
  type DriveTransport,
} from './googleDrive';
import {
  DRIVE_KEY_ENVELOPE_FILE_NAME,
  MAX_DRIVE_KEY_ENVELOPE_BYTES,
  serializeDriveKeyEnvelope,
  type DriveKeyEnvelopeV1,
} from '@shared/lib/driveKeyEnvelope';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {},
  isErrorWithCode: jest.fn(),
  statusCodes: {},
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

function response(
  status: number,
  body = '',
  headers: Record<string, string> = {},
): DriveHttpResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: name => headers[name.toLowerCase()] ?? null,
    },
    text: jest.fn().mockResolvedValue(body),
  };
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

function createAuthorization() {
  let token = 'token-1';
  const authorization = {
    authorize: jest.fn().mockResolvedValue({ status: 'authorized' }),
    withAccessToken: jest.fn(
      async <Result>(operation: (accessToken: string) => Promise<Result>) =>
        operation(token),
    ),
    clearCachedAccessToken: jest.fn(async () => {
      token = 'token-2';
    }),
  } as unknown as jest.Mocked<DriveAuthorization>;
  return authorization;
}

function createTransport(
  ...responses: DriveHttpResponse[]
): jest.MockedFunction<DriveTransport> {
  const transport = jest.fn();
  for (const item of responses) {
    transport.mockResolvedValueOnce(item);
  }
  return transport;
}

test('delegates incremental authorization without requesting extra scopes', async () => {
  const authorization = createAuthorization();
  const provider = new GoogleDriveKeyProvider(authorization, jest.fn());

  await expect(provider.authorize(true)).resolves.toEqual({
    status: 'authorized',
  });
  expect(authorization.authorize).toHaveBeenCalledWith(true);
});

test('enumerates every page and downloads the singleton envelope', async () => {
  const transport = createTransport(
    response(200, listBody([], 'next-page')),
    response(200, listBody([{ id: 'file-1' }])),
    response(200, SERIALIZED_ENVELOPE),
  );
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

  await expect(provider.getEncryptionKey()).resolves.toEqual({
    status: 'found',
    encryptionKey: ENVELOPE.encryptionKey,
  });
  expect(transport).toHaveBeenCalledTimes(3);
  expect(transport.mock.calls[1][0]).toContain('pageToken=next-page');
  expect(transport.mock.calls[2][0]).toContain('/files/file-1?alt=media');
  expect(transport.mock.calls[0][0]).toContain('spaces=appDataFolder');
});

test('returns not found when the singleton file is absent', async () => {
  const provider = new GoogleDriveKeyProvider(
    createAuthorization(),
    createTransport(response(200, listBody())),
  );

  await expect(provider.getEncryptionKey()).resolves.toEqual({
    status: 'not_found',
  });
});

test('creates a missing file in appDataFolder with multipart upload', async () => {
  const transport = createTransport(
    response(200, listBody()),
    response(200, JSON.stringify({ id: 'created' })),
  );
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

  await provider.putEncryptionKey(ENVELOPE.encryptionKey);

  const [url, request] = transport.mock.calls[1];
  expect(url).toContain('/upload/drive/v3/files?uploadType=multipart');
  expect(request.method).toBe('POST');
  expect(request.body).toContain('"parents":["appDataFolder"]');
  expect(request.body).toContain(SERIALIZED_ENVELOPE);
});

test('updates the existing singleton file instead of creating another', async () => {
  const transport = createTransport(
    response(200, listBody([{ id: 'existing' }])),
    response(200),
  );
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

  await provider.putEncryptionKey(ENVELOPE.encryptionKey);

  const [url, request] = transport.mock.calls[1];
  expect(url).toContain('/upload/drive/v3/files/existing?uploadType=media');
  expect(request).toMatchObject({
    method: 'PATCH',
    body: SERIALIZED_ENVELOPE,
  });
});

test('validates duplicate files before updating every copy', async () => {
  const transport = createTransport(
    response(200, listBody([{ id: 'one' }, { id: 'two' }])),
    response(200, SERIALIZED_ENVELOPE),
    response(200, SERIALIZED_ENVELOPE),
    response(200),
    response(200),
  );
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

  await provider.putEncryptionKey(ENVELOPE.encryptionKey);

  expect(transport).toHaveBeenCalledTimes(5);
  expect(transport.mock.calls[3][1].method).toBe('PATCH');
  expect(transport.mock.calls[4][1].method).toBe('PATCH');
});

test('rejects an invalid encryption key before sending a request', async () => {
  const transport = createTransport();
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

  await expect(provider.putEncryptionKey('invalid')).rejects.toMatchObject({
    code: 'invalid_response',
  });
  expect(transport).not.toHaveBeenCalled();
});

test('accepts byte-identical duplicate files as one logical envelope', async () => {
  const transport = createTransport(
    response(200, listBody([{ id: 'one' }, { id: 'two' }])),
    response(200, SERIALIZED_ENVELOPE),
    response(200, SERIALIZED_ENVELOPE),
  );
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

  await expect(provider.getEncryptionKey()).resolves.toEqual({
    status: 'found',
    encryptionKey: ENVELOPE.encryptionKey,
  });
});

test('treats old and current files with the same key as one logical envelope', async () => {
  const transport = createTransport(
    response(200, listBody([{ id: 'old' }, { id: 'current' }])),
    response(200, LEGACY_SERIALIZED_ENVELOPE),
    response(200, SERIALIZED_ENVELOPE),
  );
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

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
  const transport = createTransport(
    response(200, listBody([{ id: 'one' }, { id: 'two' }])),
    response(200, SERIALIZED_ENVELOPE),
    response(200, changed),
  );
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

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
  const transport = createTransport(
    response(200, listing),
    response(200, content),
  );
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

  await expect(provider.getEncryptionKey()).rejects.toMatchObject({ code });
});

test('clears the cached token and retries once after 401', async () => {
  const authorization = createAuthorization();
  const transport = createTransport(response(401), response(200, listBody()));
  const provider = new GoogleDriveKeyProvider(authorization, transport);

  await expect(provider.getEncryptionKey()).resolves.toEqual({
    status: 'not_found',
  });
  expect(authorization.clearCachedAccessToken).toHaveBeenCalledWith('token-1');
  expect(transport.mock.calls[0][1].headers.Authorization).toBe(
    'Bearer token-1',
  );
  expect(transport.mock.calls[1][1].headers.Authorization).toBe(
    'Bearer token-2',
  );
});

test('does not retry repeated 401 or a 403 as token expiry', async () => {
  const repeatedAuthorization = createAuthorization();
  const repeatedProvider = new GoogleDriveKeyProvider(
    repeatedAuthorization,
    createTransport(response(401), response(401)),
  );
  const deniedAuthorization = createAuthorization();
  const deniedTransport = createTransport(response(403));
  const deniedProvider = new GoogleDriveKeyProvider(
    deniedAuthorization,
    deniedTransport,
  );

  await expect(repeatedProvider.getEncryptionKey()).rejects.toMatchObject({
    code: 'unauthorized',
  });
  expect(repeatedAuthorization.clearCachedAccessToken).toHaveBeenCalledTimes(1);
  await expect(deniedProvider.getEncryptionKey()).rejects.toMatchObject({
    code: 'permission_denied',
  });
  expect(deniedAuthorization.clearCachedAccessToken).not.toHaveBeenCalled();
  expect(deniedTransport).toHaveBeenCalledTimes(1);
});

test('bounds pagination even when Drive keeps returning page tokens', async () => {
  const transport = createTransport(
    ...Array.from({ length: 10 }, (_, index) =>
      response(200, listBody([], `page-${index}`)),
    ),
  );
  const provider = new GoogleDriveKeyProvider(createAuthorization(), transport);

  await expect(provider.getEncryptionKey()).rejects.toMatchObject({
    code: 'invalid_response',
  });
  expect(transport).toHaveBeenCalledTimes(10);
});

test('rejects more matching files than the singleton invariant permits', async () => {
  const files = Array.from({ length: 21 }, (_, index) => ({
    id: `file-${index}`,
  }));
  const provider = new GoogleDriveKeyProvider(
    createAuthorization(),
    createTransport(response(200, listBody(files))),
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
  const provider = new GoogleDriveKeyProvider(
    createAuthorization(),
    createTransport(response(200, body)),
  );

  await expect(provider.getEncryptionKey()).rejects.toMatchObject({
    code: 'invalid_response',
  });
});

test('rejects transport, response-body, and non-success HTTP failures safely', async () => {
  const rejectedTransport = jest.fn().mockRejectedValue(new Error('offline'));
  const rejectedBody = response(200);
  jest.mocked(rejectedBody.text).mockRejectedValue(new Error('stream failed'));

  await expect(
    new GoogleDriveKeyProvider(
      createAuthorization(),
      rejectedTransport,
    ).getEncryptionKey(),
  ).rejects.toMatchObject({ code: 'network_error' });
  await expect(
    new GoogleDriveKeyProvider(
      createAuthorization(),
      createTransport(rejectedBody),
    ).getEncryptionKey(),
  ).rejects.toMatchObject({ code: 'network_error' });
  await expect(
    new GoogleDriveKeyProvider(
      createAuthorization(),
      createTransport(response(500)),
    ).getEncryptionKey(),
  ).rejects.toMatchObject({ code: 'network_error' });
});

test('enforces the declared content length before reading the body', async () => {
  const oversized = response(200, '', {
    'content-length': String(64 * 1024 + 1),
  });
  const provider = new GoogleDriveKeyProvider(
    createAuthorization(),
    createTransport(oversized),
  );

  await expect(provider.getEncryptionKey()).rejects.toMatchObject({
    code: 'response_too_large',
  });
  expect(oversized.text).not.toHaveBeenCalled();
});

test('measures multibyte response bodies in UTF-8 bytes', async () => {
  const provider = new GoogleDriveKeyProvider(
    createAuthorization(),
    createTransport(response(200, 'é€😀')),
  );

  await expect(provider.getEncryptionKey()).rejects.toMatchObject({
    code: 'invalid_response',
  });
});
