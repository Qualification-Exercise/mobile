import * as Keychain from 'react-native-keychain';
import {
  clearLocalBackupKey,
  InvalidLocalBackupKeyError,
  loadLocalBackupKey,
  saveLocalBackupKey,
} from '../localBackupKeyStorage';

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth' },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

const keychain = jest.mocked(Keychain);
const VALID_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

beforeEach(() => {
  jest.clearAllMocks();
});

test('saves only a valid key with device-only accessibility', async () => {
  await saveLocalBackupKey(VALID_KEY);

  expect(keychain.setGenericPassword).toHaveBeenCalledWith(
    'wallet-backup-key',
    VALID_KEY,
    {
      service: 'com.wdkqualification.walletBackupKey.v1.default',
      accessible: 'AccessibleWhenUnlockedThisDeviceOnly',
    },
  );
});

test.each([
  ['malformed Base64', 'not-base64'],
  ['non-canonical Base64', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
  ['incorrect key length', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='],
])('rejects %s before saving', async (_label, value) => {
  await expect(saveLocalBackupKey(value)).rejects.toBeInstanceOf(
    InvalidLocalBackupKeyError,
  );
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
});

test('loads a valid key', async () => {
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: VALID_KEY,
    service: 'com.wdkqualification.walletBackupKey.v1.default',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });

  await expect(loadLocalBackupKey()).resolves.toBe(VALID_KEY);
});

test('returns null when the key is missing', async () => {
  keychain.getGenericPassword.mockResolvedValue(false);
  await expect(loadLocalBackupKey()).resolves.toBeNull();
});

test('rejects an invalid loaded key without exposing it in the error', async () => {
  const invalidKey = 'sensitive-invalid-value';
  keychain.getGenericPassword.mockResolvedValue({
    username: 'wallet-backup-key',
    password: invalidKey,
    service: 'com.wdkqualification.walletBackupKey.v1.default',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });

  await expect(loadLocalBackupKey()).rejects.not.toThrow(invalidKey);
});

test('clears only the dedicated backup-key entry', async () => {
  await clearLocalBackupKey();
  expect(keychain.resetGenericPassword).toHaveBeenCalledWith({
    service: 'com.wdkqualification.walletBackupKey.v1.default',
  });
});
