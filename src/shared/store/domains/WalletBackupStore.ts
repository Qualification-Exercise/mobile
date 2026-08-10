import { makeAutoObservable, runInAction } from 'mobx';
import { createSecureStorage } from '@tetherto/wdk-react-native-secure-storage';
import { ApiError } from '@shared/api';
import {
  InvalidLocalBackupKeyError,
  isValidEncryptedCredential,
  isValidEncryptionKey,
  loadLocalBackupKey,
  saveLocalBackupKey,
} from '@shared/lib';
import { DEFAULT_WALLET_ID } from '@shared/lib/hooks/wallet';
import {
  RemoteRecoveryError,
  type RemoteRecoveryDiagnostics,
} from './SecretsStore';
import type { BiometryStore } from './BiometryStore';
import type { SecretsStore } from './SecretsStore';

export type WalletBackupStatus = 'idle' | 'running' | 'complete' | 'incomplete';

export type RemoteBackupPresence =
  | 'unknown'
  | 'checking'
  | 'absent'
  | 'present'
  | 'error';

export type LocalBackupRestoreErrorCode =
  | 'wallet_already_exists'
  | 'authentication_failed'
  | 'backup_unavailable'
  | 'network_error'
  | 'restore_failed';

export type BackupIssue =
  | 'local_key_missing'
  | 'invalid_local_key'
  | 'remote_missing'
  | 'remote_ambiguous'
  | 'remote_invalid';

export type LocalBackupRestorePhase =
  | 'idle'
  | 'authenticating'
  | 'loading'
  | 'writing'
  | 'unlocking'
  | 'complete'
  | 'failed';

export type WalletCredentialReaders = {
  restoreWallet: (mnemonic: string) => Promise<string>;
} & ExistingWalletCredentialReaders;

export type ExistingWalletCredentialReaders = {
  getEncryptionKey: () => Promise<string | null>;
  getEncryptedSeed: () => Promise<string | null>;
  getEncryptedEntropy: () => Promise<string | null>;
};

export type WalletUnlocker = {
  unlock: () => Promise<void>;
};

export type WalletBackupDependencies = {
  biometryStore: BiometryStore;
  secretsStore: SecretsStore;
  isAuthenticated: () => boolean;
};

export class WalletBackupStore {
  backupStatus: WalletBackupStatus = 'idle';
  backupMessage = '';
  remoteBackupPresence: RemoteBackupPresence = 'unknown';
  restorePhase: LocalBackupRestorePhase = 'idle';
  restoreError: LocalBackupRestoreErrorCode | null = null;
  restoreBackupIssue: BackupIssue | null = null;
  restoreDiagnostics: RemoteRecoveryDiagnostics | null = null;

  private walletCreatedForPendingBackup = false;

  constructor(private readonly dependencies: WalletBackupDependencies) {
    makeAutoObservable<
      WalletBackupStore,
      'dependencies' | 'walletCreatedForPendingBackup'
    >(
      this,
      { dependencies: false, walletCreatedForPendingBackup: false },
      { autoBind: true },
    );
  }

  async createAndBackupWallet(
    mnemonic: string,
    wallet: WalletCredentialReaders,
  ): Promise<boolean> {
    if (this.backupStatus === 'running') {
      return false;
    }

    this.backupStatus = 'running';
    this.backupMessage = '';

    try {
      if (!this.walletCreatedForPendingBackup) {
        if (await this.dependencies.secretsStore.hasRemoteWallet()) {
          runInAction(() => {
            this.backupStatus = 'idle';
            this.backupMessage = 'remote_wallet_exists';
            this.remoteBackupPresence = 'present';
          });
          return false;
        }
        await wallet.restoreWallet(mnemonic);
        this.walletCreatedForPendingBackup = true;
      }

      const [encryptionKey, encryptedSeed, encryptedEntropy] =
        await Promise.all([
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
        throw new Error('invalid_wallet_credentials');
      }

      await saveLocalBackupKey(encryptionKey);
      await this.dependencies.secretsStore.backupWalletSecrets({
        encryptedSeed,
        encryptedEntropy,
      });

      runInAction(() => {
        this.backupStatus = 'complete';
        this.backupMessage = '';
        this.remoteBackupPresence = 'present';
        this.walletCreatedForPendingBackup = false;
      });
      return true;
    } catch {
      runInAction(() => {
        if (this.walletCreatedForPendingBackup) {
          this.backupStatus = 'incomplete';
          this.backupMessage = 'Wallet created, backup incomplete.';
        } else {
          this.backupStatus = 'idle';
          this.backupMessage = 'Could not create wallet. Please try again.';
        }
      });
      return false;
    }
  }

  async backupExistingWallet(
    wallet: ExistingWalletCredentialReaders,
  ): Promise<boolean> {
    if (this.backupStatus === 'running') {
      return false;
    }

    this.backupStatus = 'running';
    this.backupMessage = '';

    try {
      if (await this.dependencies.secretsStore.hasRemoteWallet()) {
        runInAction(() => {
          this.backupStatus = 'idle';
          this.backupMessage =
            'A wallet backup already exists in your account.';
          this.remoteBackupPresence = 'present';
        });
        return false;
      }
      runInAction(() => {
        this.remoteBackupPresence = 'absent';
      });
    } catch {
      runInAction(() => {
        this.backupStatus = 'idle';
        this.backupMessage = 'Could not check your wallet backup status.';
        this.remoteBackupPresence = 'error';
      });
      return false;
    }

    if (!this.dependencies.isAuthenticated()) {
      this.backupStatus = 'idle';
      this.backupMessage = 'Sign in before creating a wallet backup.';
      return false;
    }

    let authOutcome;
    try {
      authOutcome = await this.dependencies.biometryStore.verify(
        'Create wallet backup',
      );
    } catch {
      runInAction(() => {
        this.backupStatus = 'idle';
        this.backupMessage = 'Authentication is required to create a backup.';
      });
      return false;
    }

    if (authOutcome !== 'unlocked') {
      runInAction(() => {
        this.backupStatus = 'idle';
        this.backupMessage = 'Authentication is required to create a backup.';
      });
      return false;
    }

    try {
      const [encryptionKey, encryptedSeed, encryptedEntropy] =
        await Promise.all([
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
        throw new Error('invalid_wallet_credentials');
      }

      await saveLocalBackupKey(encryptionKey);
      await this.dependencies.secretsStore.backupWalletSecrets({
        encryptedSeed,
        encryptedEntropy,
      });

      runInAction(() => {
        this.backupStatus = 'complete';
        this.backupMessage = 'Wallet backup created on this device.';
        this.remoteBackupPresence = 'present';
      });
      return true;
    } catch {
      runInAction(() => {
        this.backupStatus = 'incomplete';
        this.backupMessage =
          'Wallet is safe, but its backup is incomplete. Please try again.';
      });
      return false;
    }
  }

  async checkRemoteBackupPresence(): Promise<void> {
    if (this.remoteBackupPresence === 'checking') {
      return;
    }

    this.remoteBackupPresence = 'checking';
    this.backupMessage = '';
    try {
      const exists = await this.dependencies.secretsStore.hasRemoteWallet();
      runInAction(() => {
        this.remoteBackupPresence = exists ? 'present' : 'absent';
      });
    } catch {
      runInAction(() => {
        this.remoteBackupPresence = 'error';
      });
    }
  }

  async restoreFromLocalBackup(wallet: WalletUnlocker): Promise<boolean> {
    if (this.restorePhase !== 'idle' && this.restorePhase !== 'failed') {
      return false;
    }

    this.restorePhase = 'authenticating';
    this.restoreError = null;
    this.restoreBackupIssue = null;
    this.restoreDiagnostics = null;

    if (!this.dependencies.isAuthenticated()) {
      this.restorePhase = 'failed';
      this.restoreError = 'authentication_failed';
      return false;
    }

    let authOutcome;
    try {
      authOutcome = await this.dependencies.biometryStore.verify(
        'Restore wallet backup',
      );
    } catch {
      runInAction(() => {
        this.restorePhase = 'failed';
        this.restoreError = 'authentication_failed';
      });
      return false;
    }
    if (authOutcome !== 'unlocked') {
      runInAction(() => {
        this.restorePhase = 'failed';
        this.restoreError = 'authentication_failed';
      });
      return false;
    }

    let storage: ReturnType<typeof createSecureStorage> | null = null;
    let wroteCredentials = false;

    try {
      storage = createSecureStorage();
      if (await storage.hasWallet(DEFAULT_WALLET_ID)) {
        throw new LocalBackupRestoreError('wallet_already_exists');
      }

      runInAction(() => {
        this.restorePhase = 'loading';
      });
      const encryptionKey = await loadLocalBackupKey();
      if (encryptionKey == null) {
        throw new LocalBackupRestoreError('local_key_missing');
      }
      if (!isValidEncryptionKey(encryptionKey)) {
        throw new LocalBackupRestoreError('invalid_local_key');
      }

      const bundle =
        await this.dependencies.secretsStore.getRemoteRecoveryBundle();
      if (
        !isValidEncryptedCredential(bundle.encryptedSeed) ||
        !isValidEncryptedCredential(bundle.encryptedEntropy)
      ) {
        throw new LocalBackupRestoreError('remote_invalid');
      }

      runInAction(() => {
        this.restorePhase = 'writing';
      });
      wroteCredentials = true;
      await storage.setEncryptedSeed(bundle.encryptedSeed, DEFAULT_WALLET_ID);
      await storage.setEncryptedEntropy(
        bundle.encryptedEntropy,
        DEFAULT_WALLET_ID,
      );
      await storage.setEncryptionKey(encryptionKey, DEFAULT_WALLET_ID, {
        requireBiometrics: false,
      });

      runInAction(() => {
        this.restorePhase = 'unlocking';
      });
      try {
        await wallet.unlock();
      } catch {
        throw new LocalBackupRestoreError('wdk_initialization_failed');
      }

      runInAction(() => {
        this.restorePhase = 'complete';
      });
      return true;
    } catch (error) {
      if (wroteCredentials) {
        try {
          await storage?.deleteWallet(DEFAULT_WALLET_ID);
        } catch {
          // The original safe error remains more useful than cleanup details.
        }
      }

      runInAction(() => {
        const outcome = this.toRestoreOutcome(error);
        this.restorePhase = 'failed';
        this.restoreDiagnostics =
          error instanceof RemoteRecoveryError ? error.diagnostics : null;
        this.restoreError = outcome.code;
        this.restoreBackupIssue = outcome.backupIssue;
      });
      return false;
    } finally {
      storage?.cleanup();
    }
  }

  resetRestoreState(): void {
    if (this.restorePhase === 'failed' || this.restorePhase === 'complete') {
      this.restorePhase = 'idle';
      this.restoreError = null;
      this.restoreBackupIssue = null;
      this.restoreDiagnostics = null;
    }
  }

  private toRestoreOutcome(error: unknown): RestoreOutcome {
    if (error instanceof LocalBackupRestoreError) {
      if (error.code === 'wallet_already_exists') {
        return { code: 'wallet_already_exists', backupIssue: null };
      }
      if (error.code === 'wdk_initialization_failed') {
        return { code: 'restore_failed', backupIssue: null };
      }
      return { code: 'backup_unavailable', backupIssue: error.code };
    }
    if (error instanceof InvalidLocalBackupKeyError) {
      return {
        code: 'backup_unavailable',
        backupIssue: 'invalid_local_key',
      };
    }
    if (error instanceof RemoteRecoveryError) {
      if (error.code === 'not_found') {
        return { code: 'backup_unavailable', backupIssue: 'remote_missing' };
      }
      return error.code === 'ambiguous_backup'
        ? { code: 'backup_unavailable', backupIssue: 'remote_ambiguous' }
        : { code: 'backup_unavailable', backupIssue: 'remote_invalid' };
    }
    if (error instanceof ApiError) {
      return { code: 'network_error', backupIssue: null };
    }
    return { code: 'restore_failed', backupIssue: null };
  }
}

type LocalBackupRestoreFailureCode =
  | 'wallet_already_exists'
  | 'local_key_missing'
  | 'invalid_local_key'
  | 'remote_invalid'
  | 'wdk_initialization_failed';

type RestoreOutcome = {
  code: LocalBackupRestoreErrorCode;
  backupIssue: BackupIssue | null;
};

class LocalBackupRestoreError extends Error {
  constructor(readonly code: LocalBackupRestoreFailureCode) {
    super(code);
    this.name = 'LocalBackupRestoreError';
  }
}
