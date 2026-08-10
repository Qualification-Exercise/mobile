import { secretsApi } from '@shared/api';
import { hashMnemonic } from '@shared/lib';
import { SecretsStore } from './SecretsStore';

jest.mock('@shared/api', () => ({
  secretsApi: {
    getEntropy: jest.fn(),
    storeEntropy: jest.fn().mockResolvedValue(undefined),
    storeSeed: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@shared/lib', () => ({ hashMnemonic: jest.fn() }));

const getEntropy = secretsApi.getEntropy as jest.Mock;
const storeEntropy = secretsApi.storeEntropy as jest.Mock;
const storeSeed = secretsApi.storeSeed as jest.Mock;
const mockHash = hashMnemonic as jest.Mock;

describe('hasRemoteWallet', () => {
  it('is true only when the backend holds entropy', async () => {
    const store = new SecretsStore();
    getEntropy.mockResolvedValueOnce([]);
    await expect(store.hasRemoteWallet()).resolves.toBe(false);
    getEntropy.mockResolvedValueOnce([{ entropy: 'e' }]);
    await expect(store.hasRemoteWallet()).resolves.toBe(true);
  });
});

describe('backupWalletSecrets', () => {
  it('stores seed and entropy under a mnemonic-hash metadata', async () => {
    mockHash.mockResolvedValue('hash-1');
    const store = new SecretsStore();

    await store.backupWalletSecrets({
      encryptedEntropy: 'enc-e',
      encryptedSeed: 'enc-s',
      encryptionKey: 'key',
      mnemonic: 'phrase',
    });

    const metadata = {
      mnemonicHash: 'hash-1',
      encryptionKey: 'key',
      version: 1,
    };
    expect(storeSeed).toHaveBeenCalledWith({ seed: 'enc-s', metadata });
    expect(storeEntropy).toHaveBeenCalledWith({ entropy: 'enc-e', metadata });
  });
});

describe('matchMnemonic', () => {
  it('is false when the backend has no entropy', async () => {
    getEntropy.mockResolvedValueOnce([]);
    await expect(new SecretsStore().matchMnemonic('phrase')).resolves.toBe(
      false,
    );
  });

  it('accepts a legacy entry that carries no verifier hash', async () => {
    getEntropy.mockResolvedValueOnce([{ entropy: 'e', metadata: {} }]);
    await expect(new SecretsStore().matchMnemonic('phrase')).resolves.toBe(
      true,
    );
  });

  it('compares the candidate hash against the stored ones', async () => {
    getEntropy.mockResolvedValue([
      { entropy: 'e', metadata: { mnemonicHash: 'stored' } },
    ]);
    const store = new SecretsStore();

    mockHash.mockResolvedValueOnce('stored');
    await expect(store.matchMnemonic('right')).resolves.toBe(true);

    mockHash.mockResolvedValueOnce('other');
    await expect(store.matchMnemonic('wrong')).resolves.toBe(false);
  });
});
