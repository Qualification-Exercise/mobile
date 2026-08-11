import { makeAutoObservable } from 'mobx';
import { secretsApi, type RemoteRecoveryBundle } from '@shared/api';
import { isValidEncryptedCredential, RemoteRecoveryError } from '@shared/lib';

export type RemoteCredentialState = {
  encryptedSeed: string | null;
  encryptedEntropy: string | null;
};

export class SecretsStore {
  constructor() {
    makeAutoObservable(this);
  }

  async hasRemoteWallet(): Promise<boolean> {
    const [seed, entropy] = await Promise.all([
      secretsApi.getSeed(),
      secretsApi.getEntropy(),
    ]);

    return seed != null || entropy != null;
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
  const [seedRecord, entropyRecord] = await Promise.all([
    secretsApi.getSeed(),
    secretsApi.getEntropy(),
  ]);
  if (
    (seedRecord != null &&
      (typeof seedRecord.seed !== 'string' ||
        !isValidEncryptedCredential(seedRecord.seed))) ||
    (entropyRecord != null &&
      (typeof entropyRecord.entropy !== 'string' ||
        !isValidEncryptedCredential(entropyRecord.entropy)))
  ) {
    throw new RemoteRecoveryError();
  }

  return {
    encryptedSeed: seedRecord?.seed ?? null,
    encryptedEntropy: entropyRecord?.entropy ?? null,
  };
}
