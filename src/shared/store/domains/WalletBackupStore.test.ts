import * as Keychain from 'react-native-keychain';
import { createSecureStorage } from '@tetherto/wdk-react-native-secure-storage';
import { RemoteRecoveryError } from '@shared/lib';
import {
  WalletBackupStore,
  type WalletBackupDependencies,
} from './WalletBackupStore';

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
}));

jest.mock('@tetherto/wdk-react-native-secure-storage', () => ({
  createSecureStorage: jest.fn(),
}));

const VALID_KEY = Buffer.alloc(32, 0).toString('base64');
const PREVIOUS_KEY = Buffer.alloc(32, 3).toString('base64');
const SEED = Buffer.alloc(48, 0).toString('base64');
const ENTROPY = Buffer.alloc(48, 1).toString('base64');
const keychain = jest.mocked(Keychain);
const createStorage = jest.mocked(createSecureStorage);

function createDependencies() {
  const biometryStore = { verify: jest.fn().mockResolvedValue('unlocked') };
  const secretsStore = {
    hasRemoteWallet: jest.fn().mockResolvedValue(false),
    ensureRemoteWalletSecrets: jest.fn().mockResolvedValue(false),
    getRemoteCredentialState: jest.fn().mockResolvedValue({
      encryptedSeed: SEED,
      encryptedEntropy: ENTROPY,
    }),
    getRemoteRecoveryBundle: jest.fn().mockResolvedValue({
      encryptedSeed: SEED,
      encryptedEntropy: ENTROPY,
    }),
  };
  const cloudKeyProvider = {
    authorize: jest.fn().mockResolvedValue({ status: 'authorized' }),
    getEncryptionKey: jest.fn().mockResolvedValue({
      status: 'found',
      encryptionKey: VALID_KEY,
    }),
    putEncryptionKey: jest.fn().mockResolvedValue(undefined),
  };
  const getUserId = jest.fn(() => 'user-1');
  const dependencies = {
    biometryStore,
    secretsStore,
    cloudKeyProvider,
    getUserId,
    isAuthenticated: jest.fn(() => true),
  } as unknown as WalletBackupDependencies;
  return {
    dependencies,
    biometryStore,
    secretsStore,
    cloudKeyProvider,
    getUserId,
  };
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

function createWalletReaders() {
  return {
    getEncryptionKey: jest.fn().mockResolvedValue(VALID_KEY),
    getEncryptedSeed: jest.fn().mockResolvedValue(SEED),
    getEncryptedEntropy: jest.fn().mockResolvedValue(ENTROPY),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  keychain.setGenericPassword.mockResolvedValue(false);
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: PREVIOUS_KEY,
    service: 'com.wdkqualification.walletBackupKey.v1.default',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
});

test('creates once and verifies the exact WDK credential set across cloud providers', async () => {
  const { dependencies, secretsStore, cloudKeyProvider } = createDependencies();
  const store = new WalletBackupStore(dependencies);
  const wallet = {
    restoreWallet: jest.fn().mockResolvedValue('default'),
    ...createWalletReaders(),
  };

  await expect(
    store.createAndBackupWallet('private mnemonic', wallet),
  ).resolves.toBe(true);

  expect(wallet.restoreWallet).toHaveBeenCalledTimes(1);
  expect(secretsStore.ensureRemoteWalletSecrets).toHaveBeenCalledWith({
    encryptedSeed: SEED,
    encryptedEntropy: ENTROPY,
  });
  expect(cloudKeyProvider.putEncryptionKey).toHaveBeenCalledWith(VALID_KEY);
  expect(secretsStore.getRemoteRecoveryBundle).toHaveBeenCalledTimes(1);
  expect(cloudKeyProvider.getEncryptionKey).toHaveBeenCalledTimes(1);
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.cloudBackup.available).toBe(true);
  expect(JSON.stringify(store)).not.toMatch(/private mnemonic|sensitive-token/);
});

test('preserves a created wallet and completes cloud backup without recreating it', async () => {
  const { dependencies, cloudKeyProvider } = createDependencies();
  cloudKeyProvider.putEncryptionKey
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(undefined);
  const store = new WalletBackupStore(dependencies);
  const wallet = {
    restoreWallet: jest.fn().mockResolvedValue('default'),
    ...createWalletReaders(),
  };

  await expect(
    store.createAndBackupWallet('private mnemonic', wallet),
  ).resolves.toBe(false);
  expect(store.creationMessage).toBe(
    'Wallet created, cloud recovery incomplete.',
  );

  await expect(
    store.createAndBackupWallet('private mnemonic', wallet),
  ).resolves.toBe(true);
  expect(wallet.restoreWallet).toHaveBeenCalledTimes(1);
  expect(cloudKeyProvider.putEncryptionKey).toHaveBeenCalledTimes(2);
});

test('creates a Drive backup when backend ciphertext already exists', async () => {
  const { dependencies, biometryStore, secretsStore, cloudKeyProvider } =
    createDependencies();
  secretsStore.hasRemoteWallet.mockResolvedValue(true);
  const store = new WalletBackupStore(dependencies);

  await expect(store.backupExistingWallet(createWalletReaders())).resolves.toBe(
    true,
  );

  expect(biometryStore.verify).toHaveBeenCalledWith(
    'Enable Google Drive recovery',
  );
  expect(secretsStore.ensureRemoteWalletSecrets).toHaveBeenCalled();
  expect(cloudKeyProvider.putEncryptionKey).toHaveBeenCalledWith(VALID_KEY);
  expect(store.cloudMessage).toBe('Google Drive backup is ready.');
});

test.each([
  [false, false],
  [
    {
      username: 'wallet-backup-key',
      password: VALID_KEY,
      service: 'com.wdkqualification.walletBackupKey.v1.default',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    },
    true,
  ],
] as const)(
  'reports local recovery key presence as %s',
  async (credentials, expected) => {
    const { dependencies } = createDependencies();
    keychain.getGenericPassword.mockResolvedValue(credentials);
    const store = new WalletBackupStore(dependencies);

    await store.checkLocalRecoveryKeyPresence();

    expect(store.localRecoveryKeyAvailable).toBe(expected);
  },
);

test('does not expose another backend user local recovery key', async () => {
  const { dependencies, getUserId } = createDependencies();
  keychain.getGenericPassword.mockImplementation(async options => {
    const service = options?.service ?? '';
    return service.endsWith('.user-1')
      ? {
          username: 'wallet-backup-key',
          password: VALID_KEY,
          service,
          storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
        }
      : false;
  });
  const store = new WalletBackupStore(dependencies);

  await store.checkLocalRecoveryKeyPresence();
  expect(store.localRecoveryKeyAvailable).toBe(true);

  getUserId.mockReturnValue('user-2');
  await store.checkLocalRecoveryKeyPresence();
  expect(store.localRecoveryKeyAvailable).toBe(false);
});

test('reports a Drive recovery key without reading backend data', async () => {
  const { dependencies, secretsStore, cloudKeyProvider } = createDependencies();
  const store = new WalletBackupStore(dependencies);

  await store.checkCloudRecoveryKeyPresence();

  expect(store.cloudRecoveryKeyAvailable).toBe(true);
  expect(cloudKeyProvider.authorize).toHaveBeenCalledWith(false);
  expect(cloudKeyProvider.getEncryptionKey).toHaveBeenCalledTimes(1);
  expect(secretsStore.getRemoteCredentialState).not.toHaveBeenCalled();
  expect(secretsStore.getRemoteRecoveryBundle).not.toHaveBeenCalled();
});

test('does not report a Drive recovery key without silent Drive access', async () => {
  const { dependencies, cloudKeyProvider } = createDependencies();
  cloudKeyProvider.authorize.mockResolvedValue({ status: 'denied' });
  const store = new WalletBackupStore(dependencies);

  await store.checkCloudRecoveryKeyPresence();

  expect(store.cloudRecoveryKeyAvailable).toBe(false);
  expect(cloudKeyProvider.getEncryptionKey).not.toHaveBeenCalled();
});

test.each([
  [false, false],
  [
    {
      username: 'wallet-backup-key',
      password: VALID_KEY,
      service: 'com.wdkqualification.walletBackupKey.v1.default',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    },
    true,
  ],
] as const)(
  'reports the local recovery key as %s',
  async (credentials, expected) => {
    const { dependencies } = createDependencies();
    keychain.getGenericPassword.mockResolvedValue(credentials);
    const store = new WalletBackupStore(dependencies);

    await store.checkLocalBackup(createWalletReaders());

    expect(store.localBackup.available).toBe(expected);
  },
);

test('does not report a stale local key as a usable recovery backup', async () => {
  const { dependencies } = createDependencies();
  const store = new WalletBackupStore(dependencies);

  await store.checkLocalBackup(createWalletReaders());

  expect(store.localBackup.available).toBe(false);
});

test('saves and verifies local recovery independently of Drive', async () => {
  const { dependencies, biometryStore, secretsStore, cloudKeyProvider } =
    createDependencies();
  secretsStore.ensureRemoteWalletSecrets.mockResolvedValue(true);
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: VALID_KEY,
    service: 'com.wdkqualification.walletBackupKey.v1.default',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
  const store = new WalletBackupStore(dependencies);

  await expect(store.saveLocalBackup(createWalletReaders())).resolves.toBe(
    true,
  );

  expect(biometryStore.verify).toHaveBeenCalledWith(
    'Save backup on this device',
  );
  expect(secretsStore.ensureRemoteWalletSecrets).toHaveBeenCalledWith({
    encryptedSeed: SEED,
    encryptedEntropy: ENTROPY,
  });
  expect(keychain.setGenericPassword).toHaveBeenCalledWith(
    'wallet-backup-key',
    VALID_KEY,
    expect.any(Object),
  );
  expect(cloudKeyProvider.authorize).not.toHaveBeenCalled();
  expect(cloudKeyProvider.putEncryptionKey).not.toHaveBeenCalled();
  expect(store.localBackup.available).toBe(true);
  expect(store.cloudBackup.available).toBe(false);
});

test('does not save a local key when backend credentials conflict', async () => {
  const { dependencies, secretsStore } = createDependencies();
  secretsStore.ensureRemoteWalletSecrets.mockRejectedValue(
    new RemoteRecoveryError(),
  );
  const store = new WalletBackupStore(dependencies);

  await expect(store.saveLocalBackup(createWalletReaders())).resolves.toBe(
    false,
  );

  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.localBackup.available).not.toBe(true);
  expect(store.error).toEqual({ code: 'backup_unavailable' });
});

test('does not read or save the local key when authentication is cancelled', async () => {
  const { dependencies, biometryStore, secretsStore } = createDependencies();
  biometryStore.verify.mockResolvedValue('failed');
  const wallet = createWalletReaders();
  const store = new WalletBackupStore(dependencies);

  await expect(store.saveLocalBackup(wallet)).resolves.toBe(false);

  expect(wallet.getEncryptionKey).not.toHaveBeenCalled();
  expect(secretsStore.ensureRemoteWalletSecrets).not.toHaveBeenCalled();
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.localBackup.available).not.toBe(true);
});

test('does not read credentials or mutate providers when Drive consent is cancelled', async () => {
  const { dependencies, secretsStore, cloudKeyProvider } = createDependencies();
  cloudKeyProvider.authorize.mockResolvedValue({ status: 'cancelled' });
  const wallet = createWalletReaders();
  const store = new WalletBackupStore(dependencies);

  await expect(store.backupExistingWallet(wallet)).resolves.toBe(false);

  expect(wallet.getEncryptionKey).toHaveBeenCalledTimes(1);
  expect(secretsStore.ensureRemoteWalletSecrets).not.toHaveBeenCalled();
  expect(cloudKeyProvider.putEncryptionKey).not.toHaveBeenCalled();
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.error?.code).toBe('drive_access_required');
});

test('does not read wallet credentials when device authentication is cancelled', async () => {
  const { dependencies, biometryStore, cloudKeyProvider } =
    createDependencies();
  biometryStore.verify.mockResolvedValue('failed');
  const wallet = createWalletReaders();
  const store = new WalletBackupStore(dependencies);

  await expect(store.backupExistingWallet(wallet)).resolves.toBe(false);

  expect(wallet.getEncryptionKey).not.toHaveBeenCalled();
  expect(cloudKeyProvider.authorize).not.toHaveBeenCalled();
  expect(store.error?.code).toBe('authentication_failed');
});

test.each([
  [null, null, { status: 'not_found' }, false],
  [SEED, ENTROPY, { status: 'not_found' }, false],
  [null, null, { status: 'found', encryptionKey: VALID_KEY }, false],
  [SEED, ENTROPY, { status: 'found', encryptionKey: VALID_KEY }, true],
  [SEED, null, { status: 'found', encryptionKey: VALID_KEY }, false],
] as const)(
  'classifies backend %s/%s and Drive state as %s',
  async (encryptedSeed, encryptedEntropy, drive, expected) => {
    const { dependencies, secretsStore, cloudKeyProvider } =
      createDependencies();
    secretsStore.getRemoteCredentialState.mockResolvedValue({
      encryptedSeed,
      encryptedEntropy,
    });
    cloudKeyProvider.getEncryptionKey.mockResolvedValue(drive);
    const store = new WalletBackupStore(dependencies);

    await store.checkCloudBackup();

    expect(store.cloudBackup.available).toBe(expected);
  },
);

test('refuses cloud restore before authorization or download when a wallet exists', async () => {
  const { dependencies, cloudKeyProvider } = createDependencies();
  const storage = createStorageMock();
  storage.hasWallet.mockResolvedValue(true);
  createStorage.mockReturnValue(storage as never);
  const store = new WalletBackupStore(dependencies);

  await expect(
    store.restoreFromCloudBackup({ unlock: jest.fn() }),
  ).resolves.toBe(false);

  expect(cloudKeyProvider.authorize).not.toHaveBeenCalled();
  expect(cloudKeyProvider.getEncryptionKey).not.toHaveBeenCalled();
  expect(storage.setEncryptedSeed).not.toHaveBeenCalled();
  expect(store.error?.code).toBe('wallet_already_exists');
});

test('relies on WDK unlock to reject a wrong Drive key and rolls back', async () => {
  const { dependencies, cloudKeyProvider } = createDependencies();
  cloudKeyProvider.getEncryptionKey.mockResolvedValue({
    status: 'found',
    encryptionKey: Buffer.alloc(32, 9).toString('base64'),
  });
  const storage = createStorageMock();
  createStorage.mockReturnValue(storage as never);
  const store = new WalletBackupStore(dependencies);
  const unlock = jest.fn().mockRejectedValue(new Error('wrong-key'));

  await expect(store.restoreFromCloudBackup({ unlock })).resolves.toBe(false);

  expect(storage.setEncryptedSeed).toHaveBeenCalledWith(SEED, 'default');
  expect(storage.setEncryptionKey).toHaveBeenCalledWith(
    Buffer.alloc(32, 9).toString('base64'),
    'default',
    { requireBiometrics: false },
  );
  expect(unlock).toHaveBeenCalledTimes(1);
  expect(storage.deleteWallet).toHaveBeenCalledWith('default');
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.error?.code).toBe('restore_failed');
});

test('leaves local storage untouched when cloud restore consent is cancelled', async () => {
  const { dependencies, cloudKeyProvider, secretsStore } = createDependencies();
  cloudKeyProvider.authorize.mockResolvedValue({ status: 'cancelled' });
  const storage = createStorageMock();
  createStorage.mockReturnValue(storage as never);
  const store = new WalletBackupStore(dependencies);

  await expect(
    store.restoreFromCloudBackup({ unlock: jest.fn() }),
  ).resolves.toBe(false);

  expect(secretsStore.getRemoteRecoveryBundle).not.toHaveBeenCalled();
  expect(cloudKeyProvider.getEncryptionKey).not.toHaveBeenCalled();
  expect(storage.setEncryptedSeed).not.toHaveBeenCalled();
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.error?.code).toBe('drive_access_required');
});

test('writes seed, entropy and key before unlocking cloud restore', async () => {
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
  const unlock = jest.fn().mockImplementation(async () => {
    writes.push('unlock');
  });
  createStorage.mockReturnValue(storage as never);
  const store = new WalletBackupStore(dependencies);

  await expect(store.restoreFromCloudBackup({ unlock })).resolves.toBe(true);

  expect(writes).toEqual(['seed', 'entropy', 'key', 'unlock']);
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(storage.setEncryptionKey).toHaveBeenCalledWith(VALID_KEY, 'default', {
    requireBiometrics: false,
  });
  expect(store.busy).toBe(false);
  expect(store.cloudBackup.available).toBe(true);
});

test.each(['seed', 'entropy', 'key', 'unlock'] as const)(
  'rolls back a partial cloud restore when %s fails',
  async boundary => {
    const { dependencies } = createDependencies();
    const storage = createStorageMock();
    const unlock = jest.fn().mockResolvedValue(undefined);
    if (boundary === 'seed') {
      storage.setEncryptedSeed.mockRejectedValue(new Error('private-seed'));
    } else if (boundary === 'entropy') {
      storage.setEncryptedEntropy.mockRejectedValue(
        new Error('private-entropy'),
      );
    } else if (boundary === 'key') {
      storage.setEncryptionKey.mockRejectedValue(new Error('private-key'));
    } else {
      unlock.mockRejectedValue(new Error('private-unlock'));
    }
    createStorage.mockReturnValue(storage as never);
    const store = new WalletBackupStore(dependencies);

    await expect(store.restoreFromCloudBackup({ unlock })).resolves.toBe(false);

    expect(storage.deleteWallet).toHaveBeenCalledWith('default');
    expect(JSON.stringify(store)).not.toMatch(/private-/);
  },
);

test('keeps the independent local-device restore flow working', async () => {
  const { dependencies } = createDependencies();
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: VALID_KEY,
    service: 'com.wdkqualification.walletBackupKey.v1.default',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
  const storage = createStorageMock();
  createStorage.mockReturnValue(storage as never);
  const unlock = jest.fn().mockResolvedValue(undefined);

  await expect(
    new WalletBackupStore(dependencies).restoreFromLocalBackup({ unlock }),
  ).resolves.toBe(true);

  expect(storage.setEncryptedSeed).toHaveBeenCalledWith(SEED, 'default');
  expect(storage.setEncryptionKey).toHaveBeenCalledWith(VALID_KEY, 'default', {
    requireBiometrics: false,
  });
  expect(unlock).toHaveBeenCalledTimes(1);
});
