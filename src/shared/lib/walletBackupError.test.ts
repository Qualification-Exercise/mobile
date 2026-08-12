import {
  getWalletBackupErrorMessage,
  RemoteRecoveryError,
  toWalletBackupError,
  WalletBackupOperationError,
  type WalletBackupErrorCode,
} from './walletBackupError';
import {
  CloudKeyProviderError,
  type CloudKeyProviderErrorCode,
} from './cloudKeyProvider';
import { InvalidLocalBackupKeyError } from './localBackupKeyStorage';
import { ApiError } from '@shared/api/httpClient';

jest.mock('expo-crypto', () => ({}));

test.each<[WalletBackupErrorCode, string]>([
  ['authentication_failed', 'Authentication was not completed.'],
  ['drive_access_required', 'Google Drive access is required to continue.'],
  ['signed_out', 'Sign in to continue.'],
  ['connection_failed', 'Could not connect. Try again.'],
  [
    'backup_unavailable',
    'This backup is unavailable. Try another recovery method.',
  ],
  ['wallet_already_exists', 'A wallet already exists on this device.'],
  ['remote_wallet_exists', 'A wallet already exists for this account.'],
  [
    'restore_failed',
    'Could not restore wallet. Try again or use your recovery phrase.',
  ],
])('maps %s to a short user message', (code, message) => {
  expect(getWalletBackupErrorMessage({ code })).toBe(message);
});

test.each<[CloudKeyProviderErrorCode, WalletBackupErrorCode]>([
  ['token_unavailable', 'signed_out'],
  ['unauthorized', 'signed_out'],
  ['permission_denied', 'drive_access_required'],
  ['authorization_failed', 'connection_failed'],
  ['network_error', 'connection_failed'],
  ['invalid_response', 'backup_unavailable'],
  ['response_too_large', 'backup_unavailable'],
  ['remote_invariant', 'backup_unavailable'],
])('maps cloud provider error %s to %s', (providerCode, backupCode) => {
  expect(toWalletBackupError(new CloudKeyProviderError(providerCode))).toEqual({
    code: backupCode,
  });
});

test.each([
  [
    new WalletBackupOperationError('remote_wallet_exists'),
    'remote_wallet_exists',
  ],
  [new RemoteRecoveryError(), 'backup_unavailable'],
  [new InvalidLocalBackupKeyError(), 'backup_unavailable'],
  [new ApiError('offline'), 'connection_failed'],
  [new Error('unknown'), 'restore_failed'],
] as const)(
  'maps operation failures by their public error type',
  (error, code) => {
    expect(toWalletBackupError(error)).toEqual({ code });
  },
);
