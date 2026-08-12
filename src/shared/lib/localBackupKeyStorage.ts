import * as Keychain from 'react-native-keychain';
import { isValidEncryptionKey } from './secretValidation';

const LOCAL_BACKUP_KEY_SERVICE_PREFIX =
  'com.wdkqualification.walletBackupKey.v1';
const LOCAL_BACKUP_KEY_USERNAME = 'wallet-backup-key';

function localBackupKeyService(userId: string): string {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error('A user id is required for local wallet backup storage.');
  }

  return `${LOCAL_BACKUP_KEY_SERVICE_PREFIX}.${encodeURIComponent(
    normalizedUserId,
  )}`;
}

export class InvalidLocalBackupKeyError extends Error {
  constructor() {
    super('The local wallet backup key is invalid.');
    this.name = 'InvalidLocalBackupKeyError';
  }
}

export async function saveLocalBackupKey(
  userId: string,
  key: string,
): Promise<void> {
  if (!isValidEncryptionKey(key)) {
    throw new InvalidLocalBackupKeyError();
  }

  await Keychain.setGenericPassword(LOCAL_BACKUP_KEY_USERNAME, key, {
    service: localBackupKeyService(userId),
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadLocalBackupKey(
  userId: string,
): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({
    service: localBackupKeyService(userId),
  });

  if (!credentials) {
    return null;
  }

  if (!isValidEncryptionKey(credentials.password)) {
    throw new InvalidLocalBackupKeyError();
  }

  return credentials.password;
}
