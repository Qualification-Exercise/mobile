import type { WrappedKeyPayload } from '@shared/api';
import { decryptFromBase64Payload } from './aesGcm';
import { base64ToBytes, utf8BytesToString } from './base64';
import { deriveArgon2idKey } from './deriveArgon2idKey';
import { BackupPassphraseError } from '../types';

export async function unwrapEncryptionKey(
  wrappedKey: WrappedKeyPayload,
  passphrase: string,
): Promise<string> {
  if (wrappedKey.cipher !== 'aes-256-gcm') {
    throw new Error(`Unsupported wrapped key cipher: ${wrappedKey.cipher}`);
  }

  if (wrappedKey.kdf.algo !== 'argon2id') {
    throw new Error(`Unsupported wrapped key KDF: ${wrappedKey.kdf.algo}`);
  }

  const saltBytes = base64ToBytes(wrappedKey.kdf.salt);
  const derivedKey = await deriveArgon2idKey(passphrase, saltBytes, {
    m: wrappedKey.kdf.m,
    t: wrappedKey.kdf.t,
    p: wrappedKey.kdf.p,
  });

  try {
    const plaintext = decryptFromBase64Payload(
      derivedKey,
      wrappedKey.ciphertext,
    );
    return utf8BytesToString(plaintext);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('invalid ghash tag') ||
        error.message.includes('invalid tag'))
    ) {
      throw new BackupPassphraseError(
        'Incorrect backup passphrase — could not decrypt your backup',
      );
    }
    throw error;
  } finally {
    derivedKey.fill(0);
  }
}
