import { makeAutoObservable } from 'mobx';
import { secretsApi, type RemoteRecoveryBundle } from '@shared/api';
import { isValidEncryptedCredential } from '@shared/lib';

export type RemoteRecoveryErrorCode =
  | 'not_found'
  | 'ambiguous_backup'
  | 'invalid_backup';

export type RemoteRecoveryDiagnostics = {
  seedRecordCount: number;
  entropyRecordCount: number;
  distinctSeedCount: number;
  distinctEntropyCount: number;
};

export class RemoteRecoveryError extends Error {
  constructor(
    readonly code: RemoteRecoveryErrorCode,
    readonly diagnostics: RemoteRecoveryDiagnostics,
  ) {
    super('The remote wallet backup could not be used.');
    this.name = 'RemoteRecoveryError';
  }
}

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

  async backupWalletSecrets({
    encryptedEntropy,
    encryptedSeed,
  }: {
    encryptedEntropy: string;
    encryptedSeed: string;
  }): Promise<void> {
    const metadata = { version: 1 } as const;
    await secretsApi.storeSeed({ seed: encryptedSeed, metadata });
    await secretsApi.storeEntropy({ entropy: encryptedEntropy, metadata });
  }

  async getRemoteRecoveryBundle(): Promise<RemoteRecoveryBundle> {
    const [seedRecords, entropyRecords] = await Promise.all([
      secretsApi.getSeed(),
      secretsApi.getEntropy(),
    ]);
    const diagnostics = {
      seedRecordCount: seedRecords.length,
      entropyRecordCount: entropyRecords.length,
      distinctSeedCount: 0,
      distinctEntropyCount: 0,
    };
    if (seedRecords.length === 0 || entropyRecords.length === 0) {
      throw new RemoteRecoveryError('not_found', diagnostics);
    }

    const seeds = seedRecords.map(record => record.seed);
    const entropies = entropyRecords.map(record => record.entropy);
    if (
      seeds.some(
        value =>
          typeof value !== 'string' || !isValidEncryptedCredential(value),
      ) ||
      entropies.some(
        value =>
          typeof value !== 'string' || !isValidEncryptedCredential(value),
      )
    ) {
      throw new RemoteRecoveryError('invalid_backup', diagnostics);
    }

    const distinctSeeds = [...new Set(seeds as string[])];
    const distinctEntropies = [...new Set(entropies as string[])];
    diagnostics.distinctSeedCount = distinctSeeds.length;
    diagnostics.distinctEntropyCount = distinctEntropies.length;

    if (distinctSeeds.length !== 1 || distinctEntropies.length !== 1) {
      throw new RemoteRecoveryError('ambiguous_backup', diagnostics);
    }

    return {
      encryptedSeed: distinctSeeds[0],
      encryptedEntropy: distinctEntropies[0],
    };
  }
}
