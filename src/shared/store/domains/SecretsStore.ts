import { makeAutoObservable } from 'mobx';
import { secretsApi, type RemoteRecoveryBundle } from '@shared/api';
import { RemoteRecoveryError } from '@shared/lib/wallet-backup';
import { isValidEncryptedCredential } from '@shared/lib';

export type RemoteCredentialState = {
  encryptedSeed: string | null;
  encryptedEntropy: string | null;
};

export class SecretsStore {
  constructor() {
    makeAutoObservable(this);
  }

  async hasRemoteWallet(): Promise<boolean> {
    const [seeds, entropies] = await Promise.all([
      secretsApi.getSeed(),
      secretsApi.getEntropy(),
    ]);

    return seeds.length > 0 || entropies.length > 0;
  }

  async getRemoteCredentialState(): Promise<RemoteCredentialState> {
    return loadRemoteCredentialState();
  }

  async getRemoteRecoveryBundle(): Promise<RemoteRecoveryBundle> {
    const state = await loadRemoteCredentialState();
    if (state.encryptedSeed == null || state.encryptedEntropy == null) {
      throw new RemoteRecoveryError();
    }
    return {
      encryptedSeed: state.encryptedSeed,
      encryptedEntropy: state.encryptedEntropy,
    };
  }

  async ensureRemoteWalletSecrets(
    expected: RemoteRecoveryBundle,
  ): Promise<boolean> {
    if (
      !isValidEncryptedCredential(expected.encryptedSeed) ||
      !isValidEncryptedCredential(expected.encryptedEntropy)
    ) {
      throw new RemoteRecoveryError();
    }

    const current = await loadRemoteCredentialState();
    if (
      (current.encryptedSeed != null &&
        current.encryptedSeed !== expected.encryptedSeed) ||
      (current.encryptedEntropy != null &&
        current.encryptedEntropy !== expected.encryptedEntropy)
    ) {
      throw new RemoteRecoveryError();
    }

    const metadata = { version: 1 } as const;
    let changed = false;
    if (current.encryptedSeed == null) {
      await secretsApi.storeSeed({ seed: expected.encryptedSeed, metadata });
      changed = true;
    }
    if (current.encryptedEntropy == null) {
      await secretsApi.storeEntropy({
        entropy: expected.encryptedEntropy,
        metadata,
      });
      changed = true;
    }
    return changed;
  }
}

async function loadRemoteCredentialState(): Promise<RemoteCredentialState> {
  const [seedRecords, entropyRecords] = await Promise.all([
    secretsApi.getSeed(),
    secretsApi.getEntropy(),
  ]);
  const seeds = seedRecords.map(record => record.seed);
  const entropies = entropyRecords.map(record => record.entropy);
  if (
    seeds.some(
      value => typeof value !== 'string' || !isValidEncryptedCredential(value),
    ) ||
    entropies.some(
      value => typeof value !== 'string' || !isValidEncryptedCredential(value),
    )
  ) {
    throw new RemoteRecoveryError();
  }

  const distinctSeeds = [...new Set(seeds as string[])];
  const distinctEntropies = [...new Set(entropies as string[])];

  if (distinctSeeds.length > 1 || distinctEntropies.length > 1) {
    throw new RemoteRecoveryError();
  }

  return {
    encryptedSeed: distinctSeeds[0] ?? null,
    encryptedEntropy: distinctEntropies[0] ?? null,
  };
}
