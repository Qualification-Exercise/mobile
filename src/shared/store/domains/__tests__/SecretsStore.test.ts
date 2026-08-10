import { secretsApi } from '@shared/api';
import { RemoteRecoveryError, SecretsStore } from '../SecretsStore';

jest.mock('expo-local-authentication', () => ({}));
jest.mock('expo-crypto', () => ({}));

jest.mock('@shared/api', () => ({
  secretsApi: {
    getSeed: jest.fn(),
    getEntropy: jest.fn(),
    storeSeed: jest.fn(),
    storeEntropy: jest.fn(),
  },
}));

const api = jest.mocked(secretsApi);
const CIPHERTEXT = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const OTHER_CIPHERTEXT = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

beforeEach(() => {
  jest.clearAllMocks();
});

test('detects any existing remote seed or entropy record', async () => {
  api.getSeed.mockResolvedValue([{ seed: CIPHERTEXT }]);
  api.getEntropy.mockResolvedValue([]);

  await expect(new SecretsStore().hasRemoteWallet()).resolves.toBe(true);
});

test('writes ciphertext with version-only metadata', async () => {
  const store = new SecretsStore();
  await store.backupWalletSecrets({
    encryptedSeed: `${CIPHERTEXT}AAAA`,
    encryptedEntropy: CIPHERTEXT,
  });

  expect(api.storeSeed).toHaveBeenCalledWith({
    seed: `${CIPHERTEXT}AAAA`,
    metadata: { version: 1 },
  });
  expect(api.storeEntropy).toHaveBeenCalledWith({
    entropy: CIPHERTEXT,
    metadata: { version: 1 },
  });
  const serializedWrites = JSON.stringify([
    api.storeSeed.mock.calls,
    api.storeEntropy.mock.calls,
  ]);
  expect(serializedWrites).not.toMatch(/encryptionKey|mnemonicHash|mnemonic/i);
});

test('returns the only complete valid recovery bundle', async () => {
  api.getSeed.mockResolvedValue([{ seed: `${CIPHERTEXT}AAAA` }]);
  api.getEntropy.mockResolvedValue([{ entropy: CIPHERTEXT }]);

  await expect(new SecretsStore().getRemoteRecoveryBundle()).resolves.toEqual({
    encryptedSeed: `${CIPHERTEXT}AAAA`,
    encryptedEntropy: CIPHERTEXT,
  });
});

test.each([
  ['zero records', [], []],
  ['missing seed', [], [{ entropy: CIPHERTEXT }]],
  ['missing entropy', [{ seed: CIPHERTEXT }], []],
])('rejects %s as not found', async (_label, seeds, entropies) => {
  api.getSeed.mockResolvedValue(seeds);
  api.getEntropy.mockResolvedValue(entropies);

  await expect(new SecretsStore().getRemoteRecoveryBundle()).rejects.toEqual(
    expect.objectContaining<Partial<RemoteRecoveryError>>({
      code: 'not_found',
    }),
  );
});

test('rejects ambiguous records without consulting metadata keys', async () => {
  api.getSeed.mockResolvedValue([
    { seed: CIPHERTEXT, metadata: { encryptionKey: 'ignored' } },
    { seed: OTHER_CIPHERTEXT },
  ]);
  api.getEntropy.mockResolvedValue([{ entropy: CIPHERTEXT }]);

  await expect(new SecretsStore().getRemoteRecoveryBundle()).rejects.toEqual(
    expect.objectContaining({
      code: 'ambiguous_backup',
      diagnostics: expect.objectContaining({
        seedRecordCount: 2,
        distinctSeedCount: 2,
        entropyRecordCount: 1,
        distinctEntropyCount: 1,
      }),
    }),
  );
});

test('accepts repeated records when their ciphertext is identical', async () => {
  api.getSeed.mockResolvedValue([{ seed: CIPHERTEXT }, { seed: CIPHERTEXT }]);
  api.getEntropy.mockResolvedValue([
    { entropy: OTHER_CIPHERTEXT },
    { entropy: OTHER_CIPHERTEXT },
  ]);

  await expect(new SecretsStore().getRemoteRecoveryBundle()).resolves.toEqual({
    encryptedSeed: CIPHERTEXT,
    encryptedEntropy: OTHER_CIPHERTEXT,
  });
});

test.each([
  ['empty', ''],
  ['malformed', 'not-base64'],
  ['too small', 'AAAA'],
  ['oversized', `${'AAAA'.repeat(4000)}`],
])('rejects %s ciphertext', async (_label, ciphertext) => {
  api.getSeed.mockResolvedValue([{ seed: ciphertext }]);
  api.getEntropy.mockResolvedValue([{ entropy: CIPHERTEXT }]);

  await expect(new SecretsStore().getRemoteRecoveryBundle()).rejects.toEqual(
    expect.objectContaining({ code: 'invalid_backup' }),
  );
});
