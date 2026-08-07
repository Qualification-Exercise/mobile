import { makeAutoObservable } from 'mobx';
import { secretsApi } from '@shared/api';
import { hashMnemonic } from '@shared/lib';

export class SecretsStore {
  constructor() {
    makeAutoObservable(this);
  }

  async hasRemoteWallet(): Promise<boolean> {
    const entropies = await secretsApi.getEntropy();
    return entropies.length > 0;
  }

  async backupWalletSecrets({
    encryptedEntropy,
    encryptedSeed,
    encryptionKey,
    mnemonic,
  }: {
    encryptedEntropy: string;
    encryptedSeed: string;
    encryptionKey: string;
    mnemonic: string;
  }): Promise<void> {
    const mnemonicHash = await hashMnemonic(mnemonic);
    const metadata = { mnemonicHash, encryptionKey, version: 1 };
    await secretsApi.storeSeed({ seed: encryptedSeed, metadata });
    await secretsApi.storeEntropy({ entropy: encryptedEntropy, metadata });
  }

  async matchMnemonic(mnemonic: string): Promise<boolean> {
    const entropies = await secretsApi.getEntropy();
    if (entropies.length === 0) {
      return false;
    }

    const storedHashes = entropies
      .map(item => item.metadata?.mnemonicHash)
      .filter((hash): hash is string => Boolean(hash));
    // A stored wallet with no comparable verifier (e.g. written by an older
    // client) must not lock out a user who entered the correct phrase, so we
    // treat it as a match rather than block the restore.
    if (storedHashes.length === 0) {
      return true;
    }

    const candidate = await hashMnemonic(mnemonic);
    return storedHashes.includes(candidate);
  }
}
