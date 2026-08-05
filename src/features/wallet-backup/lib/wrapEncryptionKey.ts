import type { SecretsKdfFloor, WrappedKeyPayload } from '@shared/api';
import { randomBytes } from './aesGcm';
import { encryptToBase64Payload } from './aesGcm';
import { bytesToBase64, stringToUtf8Bytes } from './base64';
import { deriveArgon2idKey } from './deriveArgon2idKey';

const SALT_BYTES = 32;

export async function wrapEncryptionKey(
  passphrase: string,
  encryptionKey: string,
  floor: SecretsKdfFloor,
): Promise<WrappedKeyPayload> {
  const saltBytes = randomBytes(SALT_BYTES);
  const derivedKey = await deriveArgon2idKey(passphrase, saltBytes, floor);

  try {
    const ciphertext = encryptToBase64Payload(
      derivedKey,
      stringToUtf8Bytes(encryptionKey),
    );

    return {
      ciphertext,
      kdf: {
        algo: 'argon2id',
        salt: bytesToBase64(saltBytes),
        m: floor.m,
        t: floor.t,
        p: floor.p,
      },
      cipher: 'aes-256-gcm',
      version: 1,
    };
  } finally {
    derivedKey.fill(0);
  }
}
