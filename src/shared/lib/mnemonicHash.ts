import * as Crypto from 'expo-crypto';

export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().split(/\s+/).join(' ');
}

export function hashMnemonic(mnemonic: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalizeMnemonic(mnemonic),
  );
}
