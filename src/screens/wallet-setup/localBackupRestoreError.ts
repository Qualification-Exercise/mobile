import type {
  BackupIssue,
  LocalBackupRestoreErrorCode,
  RemoteRecoveryDiagnostics,
} from '@shared/store';

const BACKUP_UNAVAILABLE_MESSAGE =
  'The wallet backup is missing, incomplete, or invalid.';

export function getLocalBackupRestoreErrorMessage(
  code: LocalBackupRestoreErrorCode,
  backupIssue: BackupIssue | null,
  diagnostics: RemoteRecoveryDiagnostics | null,
): string {
  if (backupIssue === 'remote_ambiguous' && diagnostics) {
    return (
      `Backend returned ${diagnostics.seedRecordCount} seed records ` +
      `(${diagnostics.distinctSeedCount} distinct) and ` +
      `${diagnostics.entropyRecordCount} entropy records ` +
      `(${diagnostics.distinctEntropyCount} distinct).`
    );
  }

  switch (code) {
    case 'wallet_already_exists':
      return 'A wallet already exists on this device.';
    case 'authentication_failed':
      return 'Authentication is required to restore a wallet.';
    case 'network_error':
      return 'Could not download the wallet backup. Try again.';
    case 'restore_failed':
      return 'Could not restore the wallet securely. Try again.';
    case 'backup_unavailable':
      return BACKUP_UNAVAILABLE_MESSAGE;
  }
}
