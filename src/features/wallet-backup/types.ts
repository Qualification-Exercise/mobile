export type BackupProviderKind = 'device' | 'icloud' | 'backend';

export type BackupStatus =
  | 'idle'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed';

export type BackupOptionState = {
  enabled: boolean;
  status: BackupStatus;
  error?: string;
};

export type WalletBackupMaterial = {
  encryptionKey: string;
  encryptedEntropy: string;
  encryptedSeed: string;
  wordCount: 12 | 24;
  primaryEvmAddress: string;
};

export type BackupPayload = {
  entropy: string;
  seed: string;
  wrappedKey: import('@shared/api').WrappedKeyPayload;
  metadata: import('@shared/api').SecretMetadata;
};

export const SECRET_BLOB_LIMITS = {
  entropy: 128,
  seed: 192,
  wrappedKey: 256,
} as const;

export class BackupBlobSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupBlobSizeError';
  }
}

export class BackupPassphraseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupPassphraseError';
  }
}
