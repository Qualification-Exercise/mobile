import { makeAutoObservable, runInAction } from 'mobx';
import { createSecureStorage } from '@tetherto/wdk-react-native-secure-storage';
import {
  isValidEncryptedCredential,
  isValidEncryptionKey,
  loadLocalBackupKey,
  saveLocalBackupKey,
  getWalletBackupErrorMessage,
  toWalletBackupError,
  WalletBackupOperationError,
  type CloudAuthorizationOutcome,
  type CloudKeyProvider,
  type WalletBackupError,
} from '@shared/lib';
import { DEFAULT_WALLET_ID } from '@shared/lib/hooks/wallet';
import type { BiometryOutcome } from './BiometryStore';
import type { SecretsStore } from './SecretsStore';

type BackupAvailability = {
  available: boolean | null;
  loading: boolean;
  error: boolean;
};

type ExistingWalletCredentialReaders = {
  getEncryptionKey: () => Promise<string | null>;
  getEncryptedSeed: () => Promise<string | null>;
  getEncryptedEntropy: () => Promise<string | null>;
};

type WalletCredentialReaders = {
  restoreWallet: (mnemonic: string) => Promise<string>;
} & ExistingWalletCredentialReaders;

type WalletUnlocker = {
  unlock: () => Promise<void>;
};

type WalletCredentials = {
  encryptionKey: string;
  encryptedSeed: string;
  encryptedEntropy: string;
};

export type WalletBackupDependencies = {
  biometryStore: {
    verify: (prompt: string) => Promise<BiometryOutcome>;
  };
  secretsStore: SecretsStore;
  cloudKeyProvider: CloudKeyProvider;
  getUserId: () => string | null;
  isAuthenticated: () => boolean;
};

const UNKNOWN_AVAILABILITY: BackupAvailability = {
  available: null,
  loading: false,
  error: false,
};

export class WalletBackupStore {
  busy = false;
  creationMessage = '';
  localMessage = '';
  cloudMessage = '';
  error: WalletBackupError | null = null;
  localRecoveryKeyAvailable = false;
  cloudRecoveryKeyAvailable = false;
  backendWallet: BackupAvailability = { ...UNKNOWN_AVAILABILITY };
  localBackup: BackupAvailability = { ...UNKNOWN_AVAILABILITY };
  cloudBackup: BackupAvailability = { ...UNKNOWN_AVAILABILITY };

  private walletCreatedForPendingBackup = false;

  constructor(private readonly dependencies: WalletBackupDependencies) {
    makeAutoObservable<
      WalletBackupStore,
      'dependencies' | 'walletCreatedForPendingBackup'
    >(
      this,
      {
        dependencies: false,
        walletCreatedForPendingBackup: false,
      },
      { autoBind: true },
    );
  }

  async createAndBackupWallet(
    mnemonic: string,
    wallet: WalletCredentialReaders,
  ): Promise<boolean> {
    if (!this.beginOperation()) {
      return false;
    }
    this.creationMessage = '';

    try {
      if (!this.walletCreatedForPendingBackup) {
        if (await this.dependencies.secretsStore.hasRemoteWallet()) {
          runInAction(() => {
            this.backendWallet = available(true);
            this.error = failure('remote_wallet_exists');
          });
          return false;
        }
        await wallet.restoreWallet(mnemonic);
        this.walletCreatedForPendingBackup = true;
      }

      await this.backupWallet(wallet);
      runInAction(() => {
        this.backendWallet = available(true);
        this.cloudBackup = available(true);
        this.cloudRecoveryKeyAvailable = true;
        this.walletCreatedForPendingBackup = false;
      });
      return true;
    } catch (error) {
      this.handleFailure(error);
      runInAction(() => {
        this.creationMessage = this.walletCreatedForPendingBackup
          ? 'Wallet created, cloud recovery incomplete.'
          : 'Could not create wallet. Please try again.';
      });
      return false;
    } finally {
      this.endOperation();
    }
  }

  async backupExistingWallet(
    wallet: ExistingWalletCredentialReaders,
  ): Promise<boolean> {
    if (!this.beginOperation()) {
      return false;
    }
    this.cloudMessage = '';

    try {
      if (!(await this.authenticate('Enable Google Drive recovery'))) {
        runInAction(() => {
          this.cloudMessage = getWalletBackupErrorMessage(this.error!);
        });
        return false;
      }
      await this.backupWallet(wallet);
      runInAction(() => {
        this.backendWallet = available(true);
        this.cloudBackup = available(true);
        this.cloudRecoveryKeyAvailable = true;
        this.cloudMessage = 'Google Drive backup is ready.';
      });
      return true;
    } catch (error) {
      const backupError = this.handleFailure(error);
      runInAction(() => {
        this.cloudMessage = getWalletBackupErrorMessage(backupError);
      });
      return false;
    } finally {
      this.endOperation();
    }
  }

  async checkBackendWalletPresence(): Promise<void> {
    if (this.backendWallet.loading) {
      return;
    }
    this.backendWallet = loading();

    try {
      const exists = await this.dependencies.secretsStore.hasRemoteWallet();
      runInAction(() => {
        this.backendWallet = available(exists);
      });
    } catch {
      runInAction(() => {
        this.backendWallet = unavailable();
      });
    }
  }

  async checkLocalBackup(
    wallet: ExistingWalletCredentialReaders,
  ): Promise<void> {
    if (this.localBackup.loading) {
      return;
    }
    this.localBackup = loading();
    this.localMessage = '';

    try {
      const exists = await this.hasUsableLocalBackup(wallet);
      runInAction(() => {
        this.localBackup = available(exists);
      });
    } catch {
      runInAction(() => {
        this.localBackup = unavailable();
      });
    }
  }

  async checkLocalRecoveryKeyPresence(): Promise<void> {
    try {
      const userId = this.dependencies.getUserId();
      const exists =
        userId != null && (await loadLocalBackupKey(userId)) != null;
      runInAction(() => {
        this.localRecoveryKeyAvailable = exists;
      });
    } catch {
      runInAction(() => {
        this.localRecoveryKeyAvailable = false;
      });
    }
  }

  async checkCloudRecoveryKeyPresence(): Promise<void> {
    try {
      const authorization = await this.dependencies.cloudKeyProvider.authorize(
        false,
      );
      const exists =
        authorization.status === 'authorized' &&
        (await this.dependencies.cloudKeyProvider.getEncryptionKey()).status ===
          'found';
      runInAction(() => {
        this.cloudRecoveryKeyAvailable = exists;
      });
    } catch {
      runInAction(() => {
        this.cloudRecoveryKeyAvailable = false;
      });
    }
  }

  async checkCloudBackup(): Promise<void> {
    if (this.cloudBackup.loading || this.busy) {
      return;
    }
    this.cloudBackup = loading();
    this.cloudMessage = '';

    try {
      const exists = await this.hasCompleteCloudBackup();
      runInAction(() => {
        this.cloudBackup = available(exists);
      });
    } catch {
      runInAction(() => {
        this.cloudBackup = unavailable();
      });
    }
  }

  async saveLocalBackup(
    wallet: ExistingWalletCredentialReaders,
  ): Promise<boolean> {
    if (!this.beginOperation()) {
      return false;
    }
    this.localMessage = '';

    try {
      if (!(await this.authenticate('Save backup on this device'))) {
        runInAction(() => {
          this.localMessage = getWalletBackupErrorMessage(this.error!);
        });
        return false;
      }
      const backendChanged = await this.saveLocalBackupCredentials(wallet);
      runInAction(() => {
        this.backendWallet = available(true);
        this.localBackup = available(true);
        this.localRecoveryKeyAvailable = true;
        this.cloudBackup = backendChanged ? available(false) : this.cloudBackup;
        this.localMessage = 'Saved on this device.';
      });
      return true;
    } catch (error) {
      const backupError = this.handleFailure(error);
      runInAction(() => {
        this.localMessage = getWalletBackupErrorMessage(backupError);
      });
      return false;
    } finally {
      this.endOperation();
    }
  }

  async restoreFromCloudBackup(wallet: WalletUnlocker): Promise<boolean> {
    if (!this.beginOperation()) {
      return false;
    }

    try {
      if (!(await this.authenticate('Restore wallet from Google Drive'))) {
        return false;
      }
      await this.restoreFromCloud(wallet);
      runInAction(() => {
        this.backendWallet = available(true);
        this.cloudBackup = available(true);
        this.cloudRecoveryKeyAvailable = true;
      });
      return true;
    } catch (error) {
      this.handleFailure(error);
      return false;
    } finally {
      this.endOperation();
    }
  }

  async restoreFromLocalBackup(wallet: WalletUnlocker): Promise<boolean> {
    if (!this.beginOperation()) {
      return false;
    }

    try {
      if (!(await this.authenticate('Restore wallet backup'))) {
        return false;
      }
      await this.restoreFromLocal(wallet);
      return true;
    } catch (error) {
      this.handleFailure(error);
      return false;
    } finally {
      this.endOperation();
    }
  }

  private async hasUsableLocalBackup(
    wallet: ExistingWalletCredentialReaders,
  ): Promise<boolean> {
    const userId = this.dependencies.getUserId();
    if (userId == null) {
      return false;
    }

    const key = await loadLocalBackupKey(userId);
    if (key == null) {
      return false;
    }

    const [credentials, remote] = await Promise.all([
      this.readWalletCredentials(wallet),
      this.dependencies.secretsStore.getRemoteRecoveryBundle(),
    ]);
    return (
      key === credentials.encryptionKey &&
      remote.encryptedSeed === credentials.encryptedSeed &&
      remote.encryptedEntropy === credentials.encryptedEntropy
    );
  }

  private async hasCompleteCloudBackup(): Promise<boolean> {
    const backend =
      await this.dependencies.secretsStore.getRemoteCredentialState();
    const authorization = await this.dependencies.cloudKeyProvider.authorize(
      false,
    );
    if (authorization.status !== 'authorized') {
      return false;
    }

    const drive = await this.dependencies.cloudKeyProvider.getEncryptionKey();
    return (
      backend.encryptedSeed != null &&
      backend.encryptedEntropy != null &&
      drive.status === 'found'
    );
  }

  private async backupWallet(
    wallet: ExistingWalletCredentialReaders,
  ): Promise<void> {
    const credentials = await this.readWalletCredentials(wallet);
    await this.backupCredentials(credentials);
  }

  private async saveLocalBackupCredentials(
    wallet: ExistingWalletCredentialReaders,
  ): Promise<boolean> {
    const userId = this.requireUserId();
    const credentials = await this.readWalletCredentials(wallet);
    const backendChanged =
      await this.dependencies.secretsStore.ensureRemoteWalletSecrets({
        encryptedSeed: credentials.encryptedSeed,
        encryptedEntropy: credentials.encryptedEntropy,
      });
    await saveLocalBackupKey(userId, credentials.encryptionKey);

    const [savedKey, remote] = await Promise.all([
      loadLocalBackupKey(userId),
      this.dependencies.secretsStore.getRemoteRecoveryBundle(),
    ]);
    if (
      savedKey !== credentials.encryptionKey ||
      remote.encryptedSeed !== credentials.encryptedSeed ||
      remote.encryptedEntropy !== credentials.encryptedEntropy
    ) {
      throw new WalletBackupOperationError('backup_unavailable');
    }
    return backendChanged;
  }

  private async restoreFromCloud(wallet: WalletUnlocker): Promise<void> {
    const storage = createSecureStorage();
    let wroteCredentials = false;

    try {
      if (await storage.hasWallet(DEFAULT_WALLET_ID)) {
        throw new WalletBackupOperationError('wallet_already_exists');
      }

      const authorization = await this.dependencies.cloudKeyProvider.authorize(
        true,
      );
      this.assertCloudAuthorized(authorization);

      const bundle =
        await this.dependencies.secretsStore.getRemoteRecoveryBundle();
      const lookup =
        await this.dependencies.cloudKeyProvider.getEncryptionKey();
      if (
        lookup.status === 'not_found' ||
        !isValidEncryptionKey(lookup.encryptionKey)
      ) {
        throw new WalletBackupOperationError('backup_unavailable');
      }

      wroteCredentials = true;
      await storage.setEncryptedSeed(bundle.encryptedSeed, DEFAULT_WALLET_ID);
      await storage.setEncryptedEntropy(
        bundle.encryptedEntropy,
        DEFAULT_WALLET_ID,
      );
      await storage.setEncryptionKey(lookup.encryptionKey, DEFAULT_WALLET_ID, {
        requireBiometrics: false,
      });

      await wallet.unlock();
    } catch (error) {
      if (wroteCredentials) {
        await this.rollback(storage);
      }
      throw error;
    } finally {
      storage.cleanup();
    }
  }

  private async restoreFromLocal(wallet: WalletUnlocker): Promise<void> {
    const storage = createSecureStorage();
    let wroteCredentials = false;

    try {
      if (await storage.hasWallet(DEFAULT_WALLET_ID)) {
        throw new WalletBackupOperationError('wallet_already_exists');
      }

      const encryptionKey = await loadLocalBackupKey(this.requireUserId());
      if (encryptionKey == null) {
        throw new WalletBackupOperationError('backup_unavailable');
      }

      const bundle =
        await this.dependencies.secretsStore.getRemoteRecoveryBundle();

      wroteCredentials = true;
      await storage.setEncryptedSeed(bundle.encryptedSeed, DEFAULT_WALLET_ID);
      await storage.setEncryptedEntropy(
        bundle.encryptedEntropy,
        DEFAULT_WALLET_ID,
      );
      await storage.setEncryptionKey(encryptionKey, DEFAULT_WALLET_ID, {
        requireBiometrics: false,
      });

      try {
        await wallet.unlock();
      } catch {
        throw new WalletBackupOperationError('restore_failed');
      }
    } catch (error) {
      if (wroteCredentials) {
        await this.rollback(storage);
      }
      throw error;
    } finally {
      storage.cleanup();
    }
  }

  private async backupCredentials(
    credentials: WalletCredentials,
  ): Promise<void> {
    const authorization = await this.dependencies.cloudKeyProvider.authorize(
      true,
    );
    this.assertCloudAuthorized(authorization);

    await this.dependencies.secretsStore.ensureRemoteWalletSecrets({
      encryptedSeed: credentials.encryptedSeed,
      encryptedEntropy: credentials.encryptedEntropy,
    });
    await this.dependencies.cloudKeyProvider.putEncryptionKey(
      credentials.encryptionKey,
    );

    const [remote, drive] = await Promise.all([
      this.dependencies.secretsStore.getRemoteRecoveryBundle(),
      this.dependencies.cloudKeyProvider.getEncryptionKey(),
    ]);
    if (
      remote.encryptedSeed !== credentials.encryptedSeed ||
      remote.encryptedEntropy !== credentials.encryptedEntropy ||
      drive.status !== 'found' ||
      drive.encryptionKey !== credentials.encryptionKey
    ) {
      throw new WalletBackupOperationError('backup_unavailable');
    }
  }

  private async readWalletCredentials(
    wallet: ExistingWalletCredentialReaders,
  ): Promise<WalletCredentials> {
    const [encryptionKey, encryptedSeed, encryptedEntropy] = await Promise.all([
      wallet.getEncryptionKey(),
      wallet.getEncryptedSeed(),
      wallet.getEncryptedEntropy(),
    ]);
    if (
      encryptionKey == null ||
      encryptedSeed == null ||
      encryptedEntropy == null ||
      !isValidEncryptionKey(encryptionKey) ||
      !isValidEncryptedCredential(encryptedSeed) ||
      !isValidEncryptedCredential(encryptedEntropy)
    ) {
      throw new WalletBackupOperationError('backup_unavailable');
    }
    return { encryptionKey, encryptedSeed, encryptedEntropy };
  }

  private assertCloudAuthorized(outcome: CloudAuthorizationOutcome): void {
    if (outcome.status === 'authorized') {
      return;
    }
    throw new WalletBackupOperationError(
      outcome.status === 'signed_out' ? 'signed_out' : 'drive_access_required',
    );
  }

  private requireUserId(): string {
    const userId = this.dependencies.getUserId();
    if (userId == null) {
      throw new WalletBackupOperationError('signed_out');
    }
    return userId;
  }

  private async rollback(
    storage: ReturnType<typeof createSecureStorage>,
  ): Promise<void> {
    try {
      await storage.deleteWallet(DEFAULT_WALLET_ID);
    } catch {
      // Preserve the original restore error when cleanup also fails.
    }
  }

  private beginOperation(): boolean {
    if (this.busy) {
      return false;
    }
    this.busy = true;
    this.error = null;
    return true;
  }

  private endOperation(): void {
    runInAction(() => {
      this.busy = false;
    });
  }

  private async authenticate(prompt: string): Promise<boolean> {
    if (!this.dependencies.isAuthenticated()) {
      runInAction(() => {
        this.error = failure('signed_out');
      });
      return false;
    }

    try {
      const outcome = await this.dependencies.biometryStore.verify(prompt);
      if (outcome === 'unlocked') {
        return true;
      }
    } catch {
      // A rejected authentication prompt is handled like any failed attempt.
    }

    runInAction(() => {
      this.error = failure('authentication_failed');
    });
    return false;
  }

  private handleFailure(cause: unknown): WalletBackupError {
    const error = toWalletBackupError(cause);
    runInAction(() => {
      this.error = error;
    });
    return error;
  }
}

function loading(): BackupAvailability {
  return { available: null, loading: true, error: false };
}

function available(value: boolean): BackupAvailability {
  return { available: value, loading: false, error: false };
}

function unavailable(): BackupAvailability {
  return { available: null, loading: false, error: true };
}

function failure(code: WalletBackupError['code']): WalletBackupError {
  return { code };
}
