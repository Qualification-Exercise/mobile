import * as Keychain from 'react-native-keychain';
import { RemoteRecoveryError } from '@shared/lib';
import { WalletBackupStore } from './WalletBackupStore';
import { RootStore } from '@app/providers/RootStore';

jest.mock('expo-local-authentication', () => ({}));
jest.mock('expo-crypto', () => ({}));
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth' },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
}));

const VALID_KEY = Buffer.alloc(32, 0).toString('base64');
const PREVIOUS_KEY = Buffer.alloc(32, 3).toString('base64');
const SEED = Buffer.alloc(48, 0).toString('base64');
const ENTROPY = Buffer.alloc(48, 1).toString('base64');
const keychain = jest.mocked(Keychain);

function createDependencies() {
  const secretsStore = {
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
  const authStore = {
    user: { id: 'user-1' },
  };
  const dependencies = {
    secretsStore,
    authStore,
  } as unknown as RootStore;
  return {
    dependencies,
    secretsStore,
    cloudKeyProvider,
    authStore,
  };
}

function createWalletCredentials() {
  return {
    encryptionKey: VALID_KEY,
    encryptedSeed: SEED,
    encryptedEntropy: ENTROPY,
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

test('RootStore constructs a wallet backup store with its Google Drive client', () => {
  const root = new RootStore();

  expect(root.walletBackupStore).toBeInstanceOf(WalletBackupStore);
});

test('backs up and verifies the exact WDK credential set across cloud providers', async () => {
  const { dependencies, secretsStore, cloudKeyProvider } = createDependencies();
  const credentials = createWalletCredentials();
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await expect(store.backupToCloud(credentials)).resolves.toBe(true);

  expect(secretsStore.ensureRemoteWalletSecrets).toHaveBeenCalledWith({
    encryptedSeed: SEED,
    encryptedEntropy: ENTROPY,
  });
  expect(cloudKeyProvider.putEncryptionKey).toHaveBeenCalledWith(VALID_KEY);
  expect(secretsStore.getRemoteRecoveryBundle).toHaveBeenCalledTimes(1);
  expect(cloudKeyProvider.getEncryptionKey).toHaveBeenCalledTimes(1);
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.cloudBackupAvailable).toBe(true);
  expect(JSON.stringify(store)).not.toMatch(/sensitive-token/);
});

test('creates a Drive backup when backend ciphertext already exists', async () => {
  const { dependencies, secretsStore, cloudKeyProvider } = createDependencies();
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await expect(store.backupToCloud(createWalletCredentials())).resolves.toBe(
    true,
  );

  expect(secretsStore.ensureRemoteWalletSecrets).toHaveBeenCalled();
  expect(cloudKeyProvider.putEncryptionKey).toHaveBeenCalledWith(VALID_KEY);
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
    const { dependencies, cloudKeyProvider } = createDependencies();
    keychain.getGenericPassword.mockResolvedValue(credentials);
    const store = new WalletBackupStore(dependencies, cloudKeyProvider);

    await store.checkRecoveryOptions();

    expect(store.localRecoveryKeyAvailable).toBe(expected);
  },
);

test('does not expose another backend user local recovery key', async () => {
  const { dependencies, cloudKeyProvider } = createDependencies();
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
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await store.checkRecoveryOptions();
  expect(store.localRecoveryKeyAvailable).toBe(true);

  const actualRoot = (
    store as unknown as { root: { authStore: { user: { id: string } } } }
  ).root;
  actualRoot.authStore.user = { id: 'user-2' };
  await store.checkRecoveryOptions();
  expect(store.localRecoveryKeyAvailable).toBe(false);
});

test('reports a Drive recovery key while checking recovery options', async () => {
  const { dependencies, cloudKeyProvider } = createDependencies();
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await store.checkRecoveryOptions();

  expect(store.cloudRecoveryKeyAvailable).toBe(true);
  expect(cloudKeyProvider.authorize).toHaveBeenCalledWith(false);
  expect(cloudKeyProvider.getEncryptionKey).toHaveBeenCalledTimes(1);
});

test('does not report a Drive recovery key without silent Drive access', async () => {
  const { dependencies, cloudKeyProvider } = createDependencies();
  cloudKeyProvider.authorize.mockResolvedValue({ status: 'denied' });
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await store.checkRecoveryOptions();

  expect(store.cloudRecoveryKeyAvailable).toBe(false);
  expect(cloudKeyProvider.getEncryptionKey).not.toHaveBeenCalled();
});

test('does not offer key-only recovery after the backend backup is deleted', async () => {
  const { dependencies, secretsStore, cloudKeyProvider } = createDependencies();
  secretsStore.getRemoteCredentialState.mockResolvedValue({
    encryptedSeed: null,
    encryptedEntropy: null,
  });
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: VALID_KEY,
    service: 'com.wdkqualification.walletBackupKey.v1.default',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await store.checkRecoveryOptions();

  expect(store.backendWalletAvailable).toBe(false);
  expect(store.localRecoveryKeyAvailable).toBe(false);
  expect(store.cloudRecoveryKeyAvailable).toBe(false);
  expect(cloudKeyProvider.authorize).not.toHaveBeenCalled();
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
    const { dependencies, cloudKeyProvider } = createDependencies();
    keychain.getGenericPassword.mockResolvedValue(credentials);
    const store = new WalletBackupStore(dependencies, cloudKeyProvider);

    await store.checkBackupAvailability(createWalletCredentials());

    expect(store.localBackupAvailable).toBe(expected);
  },
);

test('does not report a stale local key as a usable recovery backup', async () => {
  const { dependencies, cloudKeyProvider } = createDependencies();
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await store.checkBackupAvailability(createWalletCredentials());

  expect(store.localBackupAvailable).toBe(false);
});

test('saves and verifies local recovery independently of Drive', async () => {
  const { dependencies, secretsStore, cloudKeyProvider } = createDependencies();
  secretsStore.ensureRemoteWalletSecrets.mockResolvedValue(true);
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: VALID_KEY,
    service: 'com.wdkqualification.walletBackupKey.v1.default',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await expect(store.saveLocalBackup(createWalletCredentials())).resolves.toBe(
    true,
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
  expect(store.localBackupAvailable).toBe(true);
  expect(store.cloudBackupAvailable).toBe(false);
});

test('does not save a local key when backend credentials conflict', async () => {
  const { dependencies, secretsStore, cloudKeyProvider } = createDependencies();
  secretsStore.ensureRemoteWalletSecrets.mockRejectedValue(
    new RemoteRecoveryError(),
  );
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await expect(store.saveLocalBackup(createWalletCredentials())).resolves.toBe(
    false,
  );

  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.localBackupAvailable).not.toBe(true);
  expect(store.error).toEqual({ code: 'backup_unavailable' });
});

test('does not mutate providers when Drive consent is cancelled', async () => {
  const { dependencies, secretsStore, cloudKeyProvider } = createDependencies();
  cloudKeyProvider.authorize.mockResolvedValue({ status: 'cancelled' });
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);
  const credentials = createWalletCredentials();

  await expect(store.backupToCloud(credentials)).resolves.toBe(false);

  expect(secretsStore.ensureRemoteWalletSecrets).not.toHaveBeenCalled();
  expect(cloudKeyProvider.putEncryptionKey).not.toHaveBeenCalled();
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.error?.code).toBe('drive_access_required');
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
    const store = new WalletBackupStore(dependencies, cloudKeyProvider);

    await store.checkBackupAvailability(createWalletCredentials());

    expect(store.cloudBackupAvailable).toBe(expected);
  },
);

test('does not load credentials when cloud restore consent is cancelled', async () => {
  const { dependencies, cloudKeyProvider, secretsStore } = createDependencies();
  cloudKeyProvider.authorize.mockResolvedValue({ status: 'cancelled' });
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await expect(store.loadBackupCredentials('cloud')).resolves.toBeNull();

  expect(secretsStore.getRemoteRecoveryBundle).not.toHaveBeenCalled();
  expect(cloudKeyProvider.getEncryptionKey).not.toHaveBeenCalled();
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  expect(store.error?.code).toBe('drive_access_required');
});

test('loads cloud credentials without writing the wallet', async () => {
  const { dependencies, cloudKeyProvider, secretsStore } = createDependencies();
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await expect(store.loadBackupCredentials('cloud')).resolves.toEqual(
    createWalletCredentials(),
  );

  expect(cloudKeyProvider.authorize).toHaveBeenCalledWith(true);
  expect(cloudKeyProvider.getEncryptionKey).toHaveBeenCalledTimes(1);
  expect(secretsStore.getRemoteRecoveryBundle).toHaveBeenCalledTimes(1);
  expect(store.status).toBe('success');
});

test('loads local credentials without requesting Drive access', async () => {
  const { dependencies, cloudKeyProvider } = createDependencies();
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: VALID_KEY,
    service: 'com.wdkqualification.walletBackupKey.v1.default',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
  const store = new WalletBackupStore(dependencies, cloudKeyProvider);

  await expect(store.loadBackupCredentials('local')).resolves.toEqual(
    createWalletCredentials(),
  );

  expect(cloudKeyProvider.authorize).not.toHaveBeenCalled();
  expect(store.status).toBe('success');
});
