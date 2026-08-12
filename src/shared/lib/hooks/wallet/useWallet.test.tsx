import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { createSecureStorage } from '@tetherto/wdk-react-native-secure-storage';
import {
  useWallet,
  type UseWalletResult,
  type WalletCredentials,
} from './useWallet';

const mockUseWalletManager = jest.fn();
const mockUseWdkApp = jest.fn();

jest.mock('@tetherto/wdk-react-native-core', () => ({
  useWalletManager: () => mockUseWalletManager(),
  useWdkApp: () => mockUseWdkApp(),
}));

jest.mock('@tetherto/wdk-react-native-secure-storage', () => ({
  createSecureStorage: jest.fn(),
}));

const VALID_KEY = Buffer.alloc(32, 0).toString('base64');
const SEED = Buffer.alloc(48, 0).toString('base64');
const ENTROPY = Buffer.alloc(48, 1).toString('base64');
const credentials: WalletCredentials = {
  encryptionKey: VALID_KEY,
  encryptedSeed: SEED,
  encryptedEntropy: ENTROPY,
};
const createStorage = jest.mocked(createSecureStorage);

let wallet: UseWalletResult;
let unlock: jest.Mock;
let storage: ReturnType<typeof createStorageMock>;

function createStorageMock() {
  return {
    hasWallet: jest.fn().mockResolvedValue(false),
    setEncryptedSeed: jest.fn().mockResolvedValue(undefined),
    setEncryptedEntropy: jest.fn().mockResolvedValue(undefined),
    setEncryptionKey: jest.fn().mockResolvedValue(undefined),
    deleteWallet: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn(),
  };
}

function Harness() {
  wallet = useWallet();
  return null;
}

beforeEach(async () => {
  unlock = jest.fn().mockResolvedValue(undefined);
  storage = createStorageMock();
  createStorage.mockReturnValue(storage as never);
  mockUseWalletManager.mockReturnValue({
    wallets: [],
    status: 'READY',
    generateMnemonic: jest.fn(),
    restoreWallet: jest.fn(),
    unlock,
    deleteWallet: jest.fn(),
    getMnemonic: jest.fn(),
    getSeedAndEntropyFromMnemonic: jest.fn(),
    getEncryptionKey: jest.fn(),
    getEncryptedSeed: jest.fn(),
    getEncryptedEntropy: jest.fn(),
  });
  mockUseWdkApp.mockReturnValue({
    state: { status: 'READY' },
    retry: jest.fn(),
  });

  await act(async () => {
    ReactTestRenderer.create(<Harness />);
  });
});

test('restores encrypted credentials and unlocks the wallet', async () => {
  const operations: string[] = [];
  storage.setEncryptedSeed.mockImplementation(async () => {
    operations.push('seed');
  });
  storage.setEncryptedEntropy.mockImplementation(async () => {
    operations.push('entropy');
  });
  storage.setEncryptionKey.mockImplementation(async () => {
    operations.push('key');
  });
  unlock.mockImplementation(async () => {
    operations.push('unlock');
  });

  await wallet.restoreWalletCredentials(credentials);

  expect(operations).toEqual(['seed', 'entropy', 'key', 'unlock']);
  expect(storage.setEncryptedSeed).toHaveBeenCalledWith(SEED, 'default');
  expect(storage.setEncryptedEntropy).toHaveBeenCalledWith(ENTROPY, 'default');
  expect(storage.setEncryptionKey).toHaveBeenCalledWith(VALID_KEY, 'default', {
    requireBiometrics: false,
  });
  expect(storage.deleteWallet).not.toHaveBeenCalled();
  expect(storage.cleanup).toHaveBeenCalledTimes(1);
});

test('does not overwrite an existing wallet', async () => {
  storage.hasWallet.mockResolvedValue(true);

  await expect(wallet.restoreWalletCredentials(credentials)).rejects.toEqual(
    expect.objectContaining({ code: 'wallet_already_exists' }),
  );

  expect(storage.setEncryptedSeed).not.toHaveBeenCalled();
  expect(storage.deleteWallet).not.toHaveBeenCalled();
  expect(storage.cleanup).toHaveBeenCalledTimes(1);
});

test.each(['seed', 'entropy', 'key', 'unlock'] as const)(
  'removes partial wallet data when %s restore fails',
  async boundary => {
    if (boundary === 'seed') {
      storage.setEncryptedSeed.mockRejectedValue(new Error('seed failed'));
    } else if (boundary === 'entropy') {
      storage.setEncryptedEntropy.mockRejectedValue(
        new Error('entropy failed'),
      );
    } else if (boundary === 'key') {
      storage.setEncryptionKey.mockRejectedValue(new Error('key failed'));
    } else {
      unlock.mockRejectedValue(new Error('unlock failed'));
    }

    await expect(
      wallet.restoreWalletCredentials(credentials),
    ).rejects.toBeDefined();

    expect(storage.deleteWallet).toHaveBeenCalledWith('default');
    expect(storage.cleanup).toHaveBeenCalledTimes(1);
  },
);
