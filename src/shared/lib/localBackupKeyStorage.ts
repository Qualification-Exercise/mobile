import * as Keychain from 'react-native-keychain';
import { isValidEncryptionKey } from './secretValidation';

const LOCAL_BACKUP_KEY_SERVICE =
  'com.wdkqualification.walletBackupKey.v1.default';
const LOCAL_BACKUP_KEY_USERNAME = 'wallet-backup-key';

export class InvalidLocalBackupKeyError extends Error {
  constructor() {
    super('The local wallet backup key is invalid.');
    this.name = 'InvalidLocalBackupKeyError';
  }
}

export async function saveLocalBackupKey(key: string): Promise<void> {
  if (!isValidEncryptionKey(key)) {
    throw new InvalidLocalBackupKeyError();
  }

  await Keychain.setGenericPassword(LOCAL_BACKUP_KEY_USERNAME, key, {
    service: LOCAL_BACKUP_KEY_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadLocalBackupKey(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({
    service: LOCAL_BACKUP_KEY_SERVICE,
  });

  if (!credentials) {
    return null;
  }

  if (!isValidEncryptionKey(credentials.password)) {
    throw new InvalidLocalBackupKeyError();
  }

  return credentials.password;
}

export async function clearLocalBackupKey(): Promise<void> {
  await Keychain.resetGenericPassword({ service: LOCAL_BACKUP_KEY_SERVICE });
}
