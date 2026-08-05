import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes as nobleRandomBytes } from '@noble/hashes/utils.js';
import { base64ToBytes, bytesToBase64 } from './base64';

const IV_BYTES = 12;
const TAG_BYTES = 16;

export function randomBytes(length: number): Uint8Array {
  return nobleRandomBytes(length);
}

export function aesGcmEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
): { iv: Uint8Array; payload: Uint8Array } {
  const iv = randomBytes(IV_BYTES);
  const cipher = gcm(key, iv);
  const encrypted = cipher.encrypt(plaintext);
  const ciphertext = encrypted.subarray(0, encrypted.length - TAG_BYTES);
  const tag = encrypted.subarray(encrypted.length - TAG_BYTES);

  const payload = new Uint8Array(IV_BYTES + ciphertext.length + TAG_BYTES);
  payload.set(iv, 0);
  payload.set(ciphertext, IV_BYTES);
  payload.set(tag, IV_BYTES + ciphertext.length);

  return { iv, payload };
}

export function aesGcmDecrypt(
  key: Uint8Array,
  payload: Uint8Array,
): Uint8Array {
  if (payload.length <= IV_BYTES + TAG_BYTES) {
    throw new Error('Ciphertext is too short');
  }

  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(payload.length - TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES, payload.length - TAG_BYTES);

  const encrypted = new Uint8Array(ciphertext.length + TAG_BYTES);
  encrypted.set(ciphertext, 0);
  encrypted.set(tag, ciphertext.length);

  const cipher = gcm(key, iv);
  return cipher.decrypt(encrypted);
}

export function encryptToBase64Payload(
  key: Uint8Array,
  plaintext: Uint8Array,
): string {
  const { payload } = aesGcmEncrypt(key, plaintext);
  return bytesToBase64(payload);
}

export function decryptFromBase64Payload(
  key: Uint8Array,
  payloadBase64: string,
): Uint8Array {
  return aesGcmDecrypt(key, base64ToBytes(payloadBase64));
}
