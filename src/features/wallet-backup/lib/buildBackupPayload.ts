import type { PutSecretRequest, WrappedKeyPayload } from '@shared/api';
import type { BackupPayload, WalletBackupMaterial } from '../types';
import { assertBlobSizes } from './assertBlobSizes';

export function buildBackupPayload(
  material: WalletBackupMaterial,
  wrappedKey: WrappedKeyPayload,
): BackupPayload {
  assertBlobSizes({
    encryptedEntropy: material.encryptedEntropy,
    encryptedSeed: material.encryptedSeed,
    wrappedKeyCiphertext: wrappedKey.ciphertext,
  });

  return {
    entropy: material.encryptedEntropy,
    seed: material.encryptedSeed,
    wrappedKey,
    metadata: {
      address: material.primaryEvmAddress,
      wordCount: material.wordCount,
    },
  };
}

export function toEntropyPutRequest(payload: BackupPayload): PutSecretRequest {
  return {
    entropy: payload.entropy,
    wrappedKey: payload.wrappedKey,
    metadata: payload.metadata,
  };
}

export function toSeedPutRequest(payload: BackupPayload): PutSecretRequest {
  return {
    seed: payload.seed,
    metadata: payload.metadata,
  };
}
