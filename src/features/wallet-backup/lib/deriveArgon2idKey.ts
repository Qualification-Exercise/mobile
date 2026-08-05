import { argon2idAsync } from '@noble/hashes/argon2.js';
import { stringToUtf8Bytes } from './base64';

const KEY_BYTES = 32;
// Yield during Argon2 on RN so Hermes stays responsive and hashing stays stable.
const ARGON2_ASYNC_TICK_MS = 10;

export async function deriveArgon2idKey(
  passphrase: string,
  saltBytes: Uint8Array,
  params: { m: number; t: number; p: number },
): Promise<Uint8Array> {
  return argon2idAsync(stringToUtf8Bytes(passphrase), saltBytes, {
    m: params.m,
    t: params.t,
    p: params.p,
    dkLen: KEY_BYTES,
    asyncTick: ARGON2_ASYNC_TICK_MS,
  });
}
