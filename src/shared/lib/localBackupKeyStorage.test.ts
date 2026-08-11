import * as Keychain from 'react-native-keychain';
import {
  InvalidLocalBackupKeyError,
  loadLocalBackupKey,
  saveLocalBackupKey,
} from './localBackupKeyStorage';

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth' },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
}));

const keychain = jest.mocked(Keychain);
const VALID_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const USER_ID = 'user/1';
const USER_SERVICE = 'com.wdkqualification.walletBackupKey.v1.user%2F1';

beforeEach(() => {
  jest.clearAllMocks();
});

test('saves only a valid key with device-only accessibility', async () => {
  await saveLocalBackupKey(USER_ID, VALID_KEY);

  expect(keychain.setGenericPassword).toHaveBeenCalledWith(
    'wallet-backup-key',
    VALID_KEY,
    {
      service: USER_SERVICE,
      accessible: 'AccessibleWhenUnlockedThisDeviceOnly',
    },
  );
});

test.each([
  ['malformed Base64', 'not-base64'],
  ['non-canonical Base64', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
  ['incorrect key length', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='],
])('rejects %s before saving', async (_label, value) => {
  await expect(saveLocalBackupKey(USER_ID, value)).rejects.toBeInstanceOf(
    InvalidLocalBackupKeyError,
  );
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
});

test('loads a valid key', async () => {
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: VALID_KEY,
    service: USER_SERVICE,
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });

  await expect(loadLocalBackupKey(USER_ID)).resolves.toBe(VALID_KEY);
  expect(keychain.getGenericPassword).toHaveBeenCalledWith({
    service: USER_SERVICE,
  });
});

test('returns null when the key is missing', async () => {
  keychain.getGenericPassword.mockResolvedValue(false);
  await expect(loadLocalBackupKey(USER_ID)).resolves.toBeNull();
});

test('rejects an invalid loaded key without exposing it in the error', async () => {
  const invalidKey = 'sensitive-invalid-value';
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: invalidKey,
    service: USER_SERVICE,
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });

  await expect(loadLocalBackupKey(USER_ID)).rejects.not.toThrow(invalidKey);
});

test('uses a separate Keychain entry for each backend user', async () => {
  keychain.getGenericPassword.mockResolvedValue(false);

  await loadLocalBackupKey('user-1');
  await loadLocalBackupKey('user-2');

  expect(keychain.getGenericPassword).toHaveBeenNthCalledWith(1, {
    service: 'com.wdkqualification.walletBackupKey.v1.user-1',
  });
  expect(keychain.getGenericPassword).toHaveBeenNthCalledWith(2, {
    service: 'com.wdkqualification.walletBackupKey.v1.user-2',
  });
});

test('rejects a blank backend user id', async () => {
  await expect(loadLocalBackupKey('   ')).rejects.toThrow(
    'A user id is required for local wallet backup storage.',
  );
  expect(keychain.getGenericPassword).not.toHaveBeenCalled();
});
