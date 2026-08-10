import * as Keychain from 'react-native-keychain';
import { createSecureStorage } from '@tetherto/wdk-react-native-secure-storage';
import {
  WalletBackupStore,
  type WalletBackupDependencies,
} from '../WalletBackupStore';

jest.mock('expo-local-authentication', () => ({}));
jest.mock('expo-crypto', () => ({}));
jest.mock('@shared/lib/hooks/wallet', () => ({
  DEFAULT_WALLET_ID: 'default',
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth' },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

jest.mock('@tetherto/wdk-react-native-secure-storage', () => ({
  createSecureStorage: jest.fn(),
}));

const VALID_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const SEED = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const ENTROPY = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

const keychain = jest.mocked(Keychain);
const createStorage = jest.mocked(createSecureStorage);

function createDependencies() {
  const biometryStore = { verify: jest.fn().mockResolvedValue('unlocked') };
  const secretsStore = {
    hasRemoteWallet: jest.fn().mockResolvedValue(false),
    backupWalletSecrets: jest.fn().mockResolvedValue(undefined),
    getRemoteRecoveryBundle: jest.fn().mockResolvedValue({
      encryptedSeed: SEED,
      encryptedEntropy: ENTROPY,
    }),
  };
  const dependencies = {
    biometryStore,
    secretsStore,
    isAuthenticated: jest.fn(() => true),
  } as unknown as WalletBackupDependencies;
  return { dependencies, biometryStore, secretsStore };
}

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

beforeEach(() => {
  jest.clearAllMocks();
  keychain.setGenericPassword.mockResolvedValue(false);
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: VALID_KEY,
    service: 'com.wdkqualification.walletBackupKey.v1.default',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
});

test('creates once and backs up the exact WDK credential set', async () => {
  const { dependencies, secretsStore } = createDependencies();
  const store = new WalletBackupStore(dependencies);
  const wallet = {
    restoreWallet: jest.fn().mockResolvedValue('default'),
    getEncryptionKey: jest.fn().mockResolvedValue(VALID_KEY),
    getEncryptedSeed: jest.fn().mockResolvedValue(SEED),
    getEncryptedEntropy: jest.fn().mockResolvedValue(ENTROPY),
  };

  await expect(
    store.createAndBackupWallet('private mnemonic', wallet),
  ).resolves.toBe(true);

  expect(wallet.restoreWallet).toHaveBeenCalledTimes(1);
  expect(secretsStore.backupWalletSecrets).toHaveBeenCalledWith({
    encryptedSeed: SEED,
    encryptedEntropy: ENTROPY,
  });
  expect(keychain.setGenericPassword).toHaveBeenCalledWith(
    'wallet-backup-key',
    VALID_KEY,
    expect.any(Object),
  );
  expect(
    JSON.stringify(secretsStore.backupWalletSecrets.mock.calls),
  ).not.toMatch(
    /private mnemonic|AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=/,
  );
});

test('preserves a created wallet and retries backup without restoring again', async () => {
  const { dependencies, secretsStore } = createDependencies();
  secretsStore.backupWalletSecrets
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(undefined);
  const store = new WalletBackupStore(dependencies);
  const wallet = {
    restoreWallet: jest.fn().mockResolvedValue('default'),
    getEncryptionKey: jest.fn().mockResolvedValue(VALID_KEY),
    getEncryptedSeed: jest.fn().mockResolvedValue(SEED),
    getEncryptedEntropy: jest.fn().mockResolvedValue(ENTROPY),
  };

  await expect(
    store.createAndBackupWallet('private mnemonic', wallet),
  ).resolves.toBe(false);
  expect(store.backupMessage).toBe('Wallet created, backup incomplete.');

  await expect(
    store.createAndBackupWallet('private mnemonic', wallet),
  ).resolves.toBe(true);
  expect(wallet.restoreWallet).toHaveBeenCalledTimes(1);
  expect(wallet.getEncryptedSeed).toHaveBeenCalledTimes(2);
});

test('creates a backup for an existing or manually restored wallet', async () => {
  const { dependencies, biometryStore, secretsStore } = createDependencies();
  const store = new WalletBackupStore(dependencies);
  const wallet = {
    getEncryptionKey: jest.fn().mockResolvedValue(VALID_KEY),
    getEncryptedSeed: jest.fn().mockResolvedValue(SEED),
    getEncryptedEntropy: jest.fn().mockResolvedValue(ENTROPY),
  };

  await expect(store.backupExistingWallet(wallet)).resolves.toBe(true);

  expect(biometryStore.verify).toHaveBeenCalledWith('Create wallet backup');
  expect(keychain.setGenericPassword).toHaveBeenCalledWith(
    'wallet-backup-key',
    VALID_KEY,
    expect.any(Object),
  );
  expect(secretsStore.backupWalletSecrets).toHaveBeenCalledWith({
    encryptedSeed: SEED,
    encryptedEntropy: ENTROPY,
  });
  expect(store.backupMessage).toBe('Wallet backup created on this device.');
});

test('does not read wallet credentials when backup authentication is cancelled', async () => {
  const { dependencies, biometryStore, secretsStore } = createDependencies();
  biometryStore.verify.mockResolvedValue('failed');
  const store = new WalletBackupStore(dependencies);
  const wallet = {
    getEncryptionKey: jest.fn(),
    getEncryptedSeed: jest.fn(),
    getEncryptedEntropy: jest.fn(),
  };

  await expect(store.backupExistingWallet(wallet)).resolves.toBe(false);

  expect(wallet.getEncryptionKey).not.toHaveBeenCalled();
  expect(secretsStore.backupWalletSecrets).not.toHaveBeenCalled();
  expect(store.backupMessage).toBe(
    'Authentication is required to create a backup.',
  );
});

test('does not offer or create another backup when one exists remotely', async () => {
  const { dependencies, secretsStore } = createDependencies();
  secretsStore.hasRemoteWallet.mockResolvedValue(true);
  const store = new WalletBackupStore(dependencies);
  const wallet = {
    getEncryptionKey: jest.fn(),
    getEncryptedSeed: jest.fn(),
    getEncryptedEntropy: jest.fn(),
  };

  await store.checkRemoteBackupPresence();
  expect(store.remoteBackupPresence).toBe('present');

  await expect(store.backupExistingWallet(wallet)).resolves.toBe(false);
  expect(wallet.getEncryptionKey).not.toHaveBeenCalled();
  expect(secretsStore.backupWalletSecrets).not.toHaveBeenCalled();
});

test('refuses backup restore when an operational wallet exists', async () => {
  const { dependencies } = createDependencies();
  const storage = createStorageMock();
  storage.hasWallet.mockResolvedValue(true);
  createStorage.mockReturnValue(storage as never);
  const unlock = jest.fn();

  await expect(
    new WalletBackupStore(dependencies).restoreFromLocalBackup({ unlock }),
  ).resolves.toBe(false);

  expect(unlock).not.toHaveBeenCalled();
  expect(storage.setEncryptedSeed).not.toHaveBeenCalled();
});

test('writes the remote set in seed, entropy, key order and unlocks', async () => {
  const { dependencies } = createDependencies();
  const storage = createStorageMock();
  const writes: string[] = [];
  storage.setEncryptedSeed.mockImplementation(async () => {
    writes.push('seed');
  });
  storage.setEncryptedEntropy.mockImplementation(async () => {
    writes.push('entropy');
  });
  storage.setEncryptionKey.mockImplementation(async () => {
    writes.push('key');
  });
  createStorage.mockReturnValue(storage as never);
  const unlock = jest.fn().mockResolvedValue(undefined);

  await expect(
    new WalletBackupStore(dependencies).restoreFromLocalBackup({ unlock }),
  ).resolves.toBe(true);

  expect(writes).toEqual(['seed', 'entropy', 'key']);
  expect(storage.setEncryptedSeed).toHaveBeenCalledWith(SEED, 'default');
  expect(storage.setEncryptedEntropy).toHaveBeenCalledWith(ENTROPY, 'default');
  expect(storage.setEncryptionKey).toHaveBeenCalledWith(VALID_KEY, 'default', {
    requireBiometrics: false,
  });
  expect(unlock).toHaveBeenCalledTimes(1);
});

test('removes partial WDK credentials after unlock failure but keeps backup key', async () => {
  const { dependencies } = createDependencies();
  const storage = createStorageMock();
  createStorage.mockReturnValue(storage as never);

  const store = new WalletBackupStore(dependencies);
  await expect(
    store.restoreFromLocalBackup({
      unlock: jest.fn().mockRejectedValue(new Error('secret details')),
    }),
  ).resolves.toBe(false);

  expect(store.restoreError).toBe('restore_failed');
  expect(storage.deleteWallet).toHaveBeenCalledWith('default');
  expect(keychain.resetGenericPassword).not.toHaveBeenCalled();
  expect(JSON.stringify(store)).not.toContain('secret details');
});
