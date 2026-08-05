export type {
  BackupOptionState,
  BackupProviderKind,
  BackupStatus,
  WalletBackupMaterial,
  BackupPayload,
} from './types';
export {
  BackupBlobSizeError,
  BackupPassphraseError,
  SECRET_BLOB_LIMITS,
} from './types';

export {
  uploadBackendBackup,
  downloadBackendBackup,
  BackendApiError,
} from './providers/BackendBackupProvider';
export type {
  UploadBackendBackupParams,
  UploadBackendBackupResult,
  DownloadBackendBackupResult,
} from './providers/BackendBackupProvider';

export { BACKUP_ADDRESS_NETWORKS } from './lib/buildLinkWalletEntries';

export { BackupOptionToggles } from './ui/BackupOptionToggles';
export { BackupPassphrasePrompt } from './ui/BackupPassphrasePrompt';
export { BackupPassphraseSheet } from './ui/BackupPassphraseSheet';

export { validatePassphrase } from './lib/validatePassphrase';
export { assertBlobSizes, describeBlobSizes } from './lib/assertBlobSizes';
export { wrapEncryptionKey } from './lib/wrapEncryptionKey';
export { unwrapEncryptionKey } from './lib/unwrapEncryptionKey';
export {
  logBackupStart,
  logBackupStep,
  logBackupSuccess,
  logBackupError,
  summarizeAddressResults,
  blobSizeSummary,
  toUserFacingBackupError,
} from './lib/backendBackupLog';
