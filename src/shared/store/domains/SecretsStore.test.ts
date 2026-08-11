import { secretsApi } from '@shared/api';
import { RemoteRecoveryError } from '@shared/lib/wallet-backup';
import { SecretsStore } from './SecretsStore';

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

test('reports no remote wallet when both record sets are empty', async () => {
  api.getSeed.mockResolvedValue([]);
  api.getEntropy.mockResolvedValue([]);

  await expect(new SecretsStore().hasRemoteWallet()).resolves.toBe(false);
});

test('writes ciphertext with version-only metadata', async () => {
  api.getSeed.mockResolvedValue([]);
  api.getEntropy.mockResolvedValue([]);
  const store = new SecretsStore();
  await expect(
    store.ensureRemoteWalletSecrets({
      encryptedSeed: `${CIPHERTEXT}AAAA`,
      encryptedEntropy: CIPHERTEXT,
    }),
  ).resolves.toBe(true);

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
])('rejects incomplete remote state: %s', async (_label, seeds, entropies) => {
  api.getSeed.mockResolvedValue(seeds);
  api.getEntropy.mockResolvedValue(entropies);

  await expect(
    new SecretsStore().getRemoteRecoveryBundle(),
  ).rejects.toBeInstanceOf(RemoteRecoveryError);
});

test('rejects invalid credentials before reading or writing remote state', async () => {
  const store = new SecretsStore();

  await expect(
    store.ensureRemoteWalletSecrets({
      encryptedSeed: 'invalid',
      encryptedEntropy: CIPHERTEXT,
    }),
  ).rejects.toBeInstanceOf(RemoteRecoveryError);
  expect(api.getSeed).not.toHaveBeenCalled();
  expect(api.storeSeed).not.toHaveBeenCalled();
});

test('rejects ambiguous records without consulting metadata keys', async () => {
  api.getSeed.mockResolvedValue([
    { seed: CIPHERTEXT, metadata: { encryptionKey: 'ignored' } },
    { seed: OTHER_CIPHERTEXT },
  ]);
  api.getEntropy.mockResolvedValue([{ entropy: CIPHERTEXT }]);

  await expect(
    new SecretsStore().getRemoteRecoveryBundle(),
  ).rejects.toBeInstanceOf(RemoteRecoveryError);
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

test('returns a valid partial singleton state', async () => {
  api.getSeed.mockResolvedValue([{ seed: CIPHERTEXT }]);
  api.getEntropy.mockResolvedValue([]);

  await expect(new SecretsStore().getRemoteCredentialState()).resolves.toEqual({
    encryptedSeed: CIPHERTEXT,
    encryptedEntropy: null,
  });
});

test('posts only a missing value when the existing value matches', async () => {
  api.getSeed.mockResolvedValue([{ seed: `${CIPHERTEXT}AAAA` }]);
  api.getEntropy.mockResolvedValue([]);
  const store = new SecretsStore();

  await expect(
    store.ensureRemoteWalletSecrets({
      encryptedSeed: `${CIPHERTEXT}AAAA`,
      encryptedEntropy: CIPHERTEXT,
    }),
  ).resolves.toBe(true);

  expect(api.storeSeed).not.toHaveBeenCalled();
  expect(api.storeEntropy).toHaveBeenCalledWith({
    entropy: CIPHERTEXT,
    metadata: { version: 1 },
  });
});

test('does not post byte-identical existing singleton values again', async () => {
  api.getSeed.mockResolvedValue([{ seed: `${CIPHERTEXT}AAAA` }]);
  api.getEntropy.mockResolvedValue([{ entropy: CIPHERTEXT }]);
  const store = new SecretsStore();

  await expect(
    store.ensureRemoteWalletSecrets({
      encryptedSeed: `${CIPHERTEXT}AAAA`,
      encryptedEntropy: CIPHERTEXT,
    }),
  ).resolves.toBe(false);

  expect(api.storeSeed).not.toHaveBeenCalled();
  expect(api.storeEntropy).not.toHaveBeenCalled();
});

test('rejects different existing ciphertext without appending records', async () => {
  api.getSeed.mockResolvedValue([{ seed: OTHER_CIPHERTEXT }]);
  api.getEntropy.mockResolvedValue([{ entropy: CIPHERTEXT }]);
  const store = new SecretsStore();

  await expect(
    store.ensureRemoteWalletSecrets({
      encryptedSeed: `${CIPHERTEXT}AAAA`,
      encryptedEntropy: CIPHERTEXT,
    }),
  ).rejects.toBeInstanceOf(RemoteRecoveryError);

  expect(api.storeSeed).not.toHaveBeenCalled();
  expect(api.storeEntropy).not.toHaveBeenCalled();
});

test('does not append the successful side when retrying a partial write', async () => {
  api.getSeed
    .mockResolvedValueOnce([])
    .mockResolvedValue([{ seed: `${CIPHERTEXT}AAAA` }]);
  api.getEntropy.mockResolvedValue([]);
  api.storeEntropy
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(undefined);
  const store = new SecretsStore();
  const expected = {
    encryptedSeed: `${CIPHERTEXT}AAAA`,
    encryptedEntropy: CIPHERTEXT,
  };

  await expect(store.ensureRemoteWalletSecrets(expected)).rejects.toThrow(
    'offline',
  );
  await expect(store.ensureRemoteWalletSecrets(expected)).resolves.toBe(true);

  expect(api.storeSeed).toHaveBeenCalledTimes(1);
  expect(api.storeEntropy).toHaveBeenCalledTimes(2);
});

test.each([
  ['empty', ''],
  ['malformed', 'not-base64'],
  ['too small', 'AAAA'],
  ['oversized', `${'AAAA'.repeat(4000)}`],
])('rejects %s ciphertext', async (_label, ciphertext) => {
  api.getSeed.mockResolvedValue([{ seed: ciphertext }]);
  api.getEntropy.mockResolvedValue([{ entropy: CIPHERTEXT }]);

  await expect(
    new SecretsStore().getRemoteRecoveryBundle(),
  ).rejects.toBeInstanceOf(RemoteRecoveryError);
});
