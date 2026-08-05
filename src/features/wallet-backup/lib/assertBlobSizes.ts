import { BackupBlobSizeError, SECRET_BLOB_LIMITS } from '../types';

type BlobSizes = {
  encryptedEntropy: string;
  encryptedSeed: string;
  wrappedKeyCiphertext: string;
};

export function assertBlobSizes(blobs: BlobSizes): void {
  if (blobs.encryptedEntropy.length > SECRET_BLOB_LIMITS.entropy) {
    throw new BackupBlobSizeError(
      `Encrypted entropy exceeds backend limit (${SECRET_BLOB_LIMITS.entropy} base64 chars)`,
    );
  }

  if (blobs.encryptedSeed.length > SECRET_BLOB_LIMITS.seed) {
    throw new BackupBlobSizeError(
      `Encrypted seed exceeds backend limit (${SECRET_BLOB_LIMITS.seed} base64 chars)`,
    );
  }

  if (blobs.wrappedKeyCiphertext.length > SECRET_BLOB_LIMITS.wrappedKey) {
    throw new BackupBlobSizeError(
      `Wrapped key exceeds backend limit (${SECRET_BLOB_LIMITS.wrappedKey} base64 chars)`,
    );
  }
}

export function describeBlobSizes(blobs: BlobSizes): string {
  return [
    `entropy=${blobs.encryptedEntropy.length}/${SECRET_BLOB_LIMITS.entropy}`,
    `seed=${blobs.encryptedSeed.length}/${SECRET_BLOB_LIMITS.seed}`,
    `wrappedKey=${blobs.wrappedKeyCiphertext.length}/${SECRET_BLOB_LIMITS.wrappedKey}`,
  ].join(', ');
}
