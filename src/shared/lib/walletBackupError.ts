import { ApiError } from '@shared/api/httpClient';
import { InvalidLocalBackupKeyError } from './localBackupKeyStorage';
import { CloudKeyProviderError } from './cloudKeyProvider';

export type WalletBackupErrorCode =
  | 'authentication_failed'
  | 'signed_out'
  | 'drive_access_required'
  | 'connection_failed'
  | 'backup_unavailable'
  | 'wallet_already_exists'
  | 'remote_wallet_exists'
  | 'restore_failed';

export type WalletBackupError = {
  code: WalletBackupErrorCode;
};

export class RemoteRecoveryError extends Error {
  constructor() {
    super('The remote wallet backup could not be used.');
    this.name = 'RemoteRecoveryError';
  }
}

export class WalletBackupOperationError extends Error {
  constructor(readonly code: WalletBackupErrorCode) {
    super('The wallet backup operation failed.');
    this.name = 'WalletBackupOperationError';
  }
}

export function toWalletBackupError(error: unknown): WalletBackupError {
  if (error instanceof WalletBackupOperationError) {
    return failure(error.code);
  }

  if (error instanceof RemoteRecoveryError) {
    return failure('backup_unavailable');
  }

  if (error instanceof InvalidLocalBackupKeyError) {
    return failure('backup_unavailable');
  }

  if (error instanceof CloudKeyProviderError) {
    if (error.code === 'unauthorized' || error.code === 'token_unavailable') {
      return failure('signed_out');
    }
    if (error.code === 'permission_denied') {
      return failure('drive_access_required');
    }
    if (
      error.code === 'network_error' ||
      error.code === 'authorization_failed'
    ) {
      return failure('connection_failed');
    }
    return failure('backup_unavailable');
  }

  if (error instanceof ApiError) {
    return failure('connection_failed');
  }

  return failure('restore_failed');
}

export function getWalletBackupErrorMessage(error: WalletBackupError): string {
  switch (error.code) {
    case 'authentication_failed':
      return 'Authentication was not completed.';
    case 'drive_access_required':
      return 'Google Drive access is required to continue.';
    case 'signed_out':
      return 'Sign in to continue.';
    case 'connection_failed':
      return 'Could not connect. Try again.';
    case 'backup_unavailable':
      return 'This backup is unavailable. Try another recovery method.';
    case 'wallet_already_exists':
      return 'A wallet already exists on this device.';
    case 'remote_wallet_exists':
      return 'A wallet already exists for this account.';
    case 'restore_failed':
      return 'Could not restore wallet. Try again or use your recovery phrase.';
  }
}

function failure(code: WalletBackupErrorCode): WalletBackupError {
  return { code };
}
