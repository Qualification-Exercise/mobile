import { getRandomValues as expoGetRandomValues } from 'expo-crypto';

// @noble/hashes and @noble/ciphers expect Web Crypto `globalThis.crypto.getRandomValues`.
// Hermes does not provide it — wire expo-crypto before any wallet-backup crypto runs.
export function installCryptoGetRandomValuesPolyfill(): void {
  const root = globalThis as typeof globalThis & {
    crypto?: Crypto;
  };

  const cryptoObject = root.crypto ?? ({} as Crypto);

  if (typeof cryptoObject.getRandomValues !== 'function') {
    Object.defineProperty(cryptoObject, 'getRandomValues', {
      value: expoGetRandomValues,
      configurable: true,
    });
  }

  if (!root.crypto) {
    Object.defineProperty(root, 'crypto', {
      value: cryptoObject,
      configurable: true,
    });
  }
}

installCryptoGetRandomValuesPolyfill();
