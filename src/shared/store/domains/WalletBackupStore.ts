import { makeAutoObservable, runInAction } from 'mobx';
import {
  isValidEncryptionKey,
  loadLocalBackupKey,
  saveLocalBackupKey,
  toWalletBackupError,
  WalletBackupOperationError,
  type WalletBackupError,
} from '@shared/lib';
import { type CloudKeyProvider } from '@shared/lib/cloudKeyProvider';
import { type WalletCredentials } from '@shared/lib/hooks/wallet';
import { GoogleDriveClient } from '@shared/api';
import type { RootStore } from '@app/providers/RootStore';

type WalletBackupStatus = 'idle' | 'loading' | 'success' | 'error';

type BackupSource = 'cloud' | 'local';

export class WalletBackupStore {
  status: WalletBackupStatus = 'idle';
  error: WalletBackupError | null = null;
  backendWalletAvailable: boolean | null = null;
  localBackupAvailable: boolean | null = null;
  cloudBackupAvailable: boolean | null = null;
  localRecoveryKeyAvailable: boolean | null = null;
  cloudRecoveryKeyAvailable: boolean | null = null;

  constructor(
    private readonly root: RootStore,
    private readonly googleDriveClient: CloudKeyProvider = new GoogleDriveClient(),
  ) {
    makeAutoObservable(this);
  }

  async backupToCloud(credentials: WalletCredentials): Promise<boolean> {
    if (this.status === 'loading') {
      return false;
    }
    this.status = 'loading';
    this.error = null;

    try {
      const authorization = await this.googleDriveClient.authorize(true);
      if (authorization.status !== 'authorized') {
        throw new WalletBackupOperationError(
          authorization.status === 'signed_out'
            ? 'signed_out'
            : 'drive_access_required',
        );
      }
      await this.root.secretsStore.ensureRemoteWalletSecrets({
        encryptedSeed: credentials.encryptedSeed,
        encryptedEntropy: credentials.encryptedEntropy,
      });
      await this.googleDriveClient.putEncryptionKey(credentials.encryptionKey);

      const [remote, drive] = await Promise.all([
        this.root.secretsStore.getRemoteRecoveryBundle(),
        this.googleDriveClient.getEncryptionKey(),
      ]);
      if (
        remote.encryptedSeed !== credentials.encryptedSeed ||
        remote.encryptedEntropy !== credentials.encryptedEntropy ||
        drive.status !== 'found' ||
        drive.encryptionKey !== credentials.encryptionKey
      ) {
        throw new WalletBackupOperationError('backup_unavailable');
      }

      runInAction(() => {
        this.backendWalletAvailable = true;
        this.cloudBackupAvailable = true;
        this.cloudRecoveryKeyAvailable = true;
        this.status = 'success';
      });
      return true;
    } catch (cause) {
      runInAction(() => {
        this.error = toWalletBackupError(cause);
        this.status = 'error';
      });
      return false;
    }
  }

  async checkBackupAvailability(
    credentials?: WalletCredentials,
  ): Promise<void> {
    this.status = 'loading';
    this.error = null;

    try {
      const userId = this.root.authStore.user?.id ?? null;
      const [localKey, remote, authorization] = await Promise.all([
        userId == null ? null : loadLocalBackupKey(userId),
        this.root.secretsStore.getRemoteCredentialState(),
        this.googleDriveClient.authorize(false),
      ]);
      const drive =
        authorization.status === 'authorized'
          ? await this.googleDriveClient.getEncryptionKey()
          : null;

      const hasRemoteCredentials =
        remote.encryptedSeed != null && remote.encryptedEntropy != null;
      const localKeyMatchesWallet =
        credentials != null && localKey === credentials.encryptionKey;
      const remoteCredentialsMatchWallet =
        credentials != null &&
        remote.encryptedSeed === credentials.encryptedSeed &&
        remote.encryptedEntropy === credentials.encryptedEntropy;
      const localBackupAvailable =
        localKeyMatchesWallet && remoteCredentialsMatchWallet;
      const cloudBackupAvailable =
        hasRemoteCredentials && drive?.status === 'found';

      runInAction(() => {
        this.backendWalletAvailable = hasRemoteCredentials;
        this.localBackupAvailable = localBackupAvailable;
        this.cloudBackupAvailable = cloudBackupAvailable;
        this.status = 'success';
      });
    } catch (cause) {
      runInAction(() => {
        this.backendWalletAvailable = null;
        this.localBackupAvailable = null;
        this.cloudBackupAvailable = null;
        this.error = toWalletBackupError(cause);
        this.status = 'error';
      });
    }
  }

  async checkRecoveryOptions(): Promise<void> {
    this.status = 'loading';
    this.error = null;
    this.backendWalletAvailable = null;
    this.localRecoveryKeyAvailable = null;
    this.cloudRecoveryKeyAvailable = null;

    try {
      const userId = this.root.authStore.user?.id ?? null;
      const [remote, localKey] = await Promise.all([
        this.root.secretsStore.getRemoteCredentialState(),
        userId == null ? null : loadLocalBackupKey(userId),
      ]);

      const backendWalletAvailable =
        remote.encryptedSeed != null || remote.encryptedEntropy != null;
      const backendBackupAvailable =
        remote.encryptedSeed != null && remote.encryptedEntropy != null;
      let cloudRecoveryAvailable = false;

      if (backendBackupAvailable) {
        const authorization = await this.googleDriveClient.authorize(false);
        cloudRecoveryAvailable =
          authorization.status === 'authorized' &&
          (await this.googleDriveClient.getEncryptionKey()).status === 'found';
      }

      runInAction(() => {
        this.backendWalletAvailable = backendWalletAvailable;
        this.localRecoveryKeyAvailable =
          backendBackupAvailable && localKey != null;
        this.cloudRecoveryKeyAvailable = cloudRecoveryAvailable;
        this.status = 'success';
      });
    } catch (cause) {
      runInAction(() => {
        this.backendWalletAvailable = null;
        this.localRecoveryKeyAvailable = null;
        this.cloudRecoveryKeyAvailable = null;
        this.error = toWalletBackupError(cause);
        this.status = 'error';
      });
    }
  }

  async saveLocalBackup(credentials: WalletCredentials): Promise<boolean> {
    if (this.status === 'loading') {
      return false;
    }
    this.status = 'loading';
    this.error = null;

    try {
      const userId = this.root.authStore.user?.id ?? null;
      if (userId == null) {
        throw new WalletBackupOperationError('signed_out');
      }
      const backendChanged =
        await this.root.secretsStore.ensureRemoteWalletSecrets({
          encryptedSeed: credentials.encryptedSeed,
          encryptedEntropy: credentials.encryptedEntropy,
        });
      await saveLocalBackupKey(userId, credentials.encryptionKey);

      const [savedKey, remote] = await Promise.all([
        loadLocalBackupKey(userId),
        this.root.secretsStore.getRemoteRecoveryBundle(),
      ]);
      if (
        savedKey !== credentials.encryptionKey ||
        remote.encryptedSeed !== credentials.encryptedSeed ||
        remote.encryptedEntropy !== credentials.encryptedEntropy
      ) {
        throw new WalletBackupOperationError('backup_unavailable');
      }

      runInAction(() => {
        this.backendWalletAvailable = true;
        this.localBackupAvailable = true;
        this.localRecoveryKeyAvailable = true;
        this.cloudBackupAvailable = backendChanged
          ? false
          : this.cloudBackupAvailable;
        this.status = 'success';
      });
      return true;
    } catch (cause) {
      runInAction(() => {
        this.error = toWalletBackupError(cause);
        this.status = 'error';
      });
      return false;
    }
  }

  async loadBackupCredentials(
    source: BackupSource,
  ): Promise<WalletCredentials | null> {
    if (this.status === 'loading') {
      return null;
    }
    this.status = 'loading';
    this.error = null;

    try {
      let encryptionKey: string | null;
      if (source === 'cloud') {
        const authorization = await this.googleDriveClient.authorize(true);
        if (authorization.status !== 'authorized') {
          throw new WalletBackupOperationError(
            authorization.status === 'signed_out'
              ? 'signed_out'
              : 'drive_access_required',
          );
        }
        const lookup = await this.googleDriveClient.getEncryptionKey();
        encryptionKey = lookup.status === 'found' ? lookup.encryptionKey : null;
      } else {
        const userId = this.root.authStore.user?.id ?? null;
        if (userId == null) {
          throw new WalletBackupOperationError('signed_out');
        }
        encryptionKey = await loadLocalBackupKey(userId);
      }
      if (encryptionKey == null || !isValidEncryptionKey(encryptionKey)) {
        throw new WalletBackupOperationError('backup_unavailable');
      }

      const bundle = await this.root.secretsStore.getRemoteRecoveryBundle();

      runInAction(() => {
        this.backendWalletAvailable = true;
        if (source === 'cloud') {
          this.cloudBackupAvailable = true;
          this.cloudRecoveryKeyAvailable = true;
        }
        this.status = 'success';
      });
      return {
        encryptionKey,
        encryptedSeed: bundle.encryptedSeed,
        encryptedEntropy: bundle.encryptedEntropy,
      };
    } catch (cause) {
      runInAction(() => {
        this.error = toWalletBackupError(cause);
        this.status = 'error';
      });
      return null;
    }
  }
}
