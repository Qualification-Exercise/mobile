import type { AddressInfoResult } from '@tetherto/wdk-react-native-core';
import {
  ensureBackendSession,
  getBackendConfig,
  getEntropySecret,
  getSeedSecret,
  linkWallets,
  putEntropySecret,
  putSeedSecret,
  BackendApiError,
} from '@shared/api';
import type { SecretsKdfFloor } from '@shared/api';
import {
  buildBackupPayload,
  toEntropyPutRequest,
  toSeedPutRequest,
} from '../lib/buildBackupPayload';
import { buildLinkWalletEntries } from '../lib/buildLinkWalletEntries';
import {
  blobSizeSummary,
  logBackupError,
  logBackupStart,
  logBackupStep,
  logBackupSuccess,
  summarizeAddressResults,
  toUserFacingBackupError,
} from '../lib/backendBackupLog';
import { describeBlobSizes } from '../lib/assertBlobSizes';
import { resolvePrimaryEvmAddress } from '../lib/resolvePrimaryEvmAddress';
import { assertPassphrase } from '../lib/validatePassphrase';
import { wrapEncryptionKey } from '../lib/wrapEncryptionKey';
import { unwrapEncryptionKey } from '../lib/unwrapEncryptionKey';
import type { WalletBackupMaterial } from '../types';

export type UploadBackendBackupParams = {
  passphrase: string;
  confirmPassphrase: string;
  material: Omit<WalletBackupMaterial, 'primaryEvmAddress'>;
  addresses: AddressInfoResult[];
};

export type UploadBackendBackupResult = {
  primaryEvmAddress: string;
};

export type DownloadBackendBackupResult = {
  encryptionKey: string;
  encryptedEntropy: string;
  encryptedSeed: string;
  wordCount: 12 | 24;
};

export async function uploadBackendBackup(
  params: UploadBackendBackupParams,
): Promise<UploadBackendBackupResult> {
  logBackupStart('upload started');
  logBackupStep(
    'address prefetch summary',
    summarizeAddressResults(params.addresses),
  );
  logBackupStep('blob sizes (pre-upload)', {
    ...blobSizeSummary(params.material),
    sizes: describeBlobSizes({
      encryptedEntropy: params.material.encryptedEntropy,
      encryptedSeed: params.material.encryptedSeed,
      wrappedKeyCiphertext: '(pending wrap)',
    }),
  });

  try {
    logBackupStep('ensureBackendSession');
    await ensureBackendSession();
    logBackupSuccess('ensureBackendSession');

    logBackupStep('getBackendConfig');
    const config = await getBackendConfig();
    const floor: SecretsKdfFloor = config.secretsKdfFloor;
    logBackupSuccess('getBackendConfig', { kdfFloor: floor });

    logBackupStep('validatePassphrase');
    assertPassphrase(params.passphrase, params.confirmPassphrase, floor);
    logBackupSuccess('validatePassphrase');

    logBackupStep('resolvePrimaryEvmAddress');
    const primaryEvmAddress = resolvePrimaryEvmAddress(params.addresses);
    logBackupSuccess('resolvePrimaryEvmAddress', { primaryEvmAddress });

    logBackupStep('buildLinkWalletEntries');
    const linkEntries = buildLinkWalletEntries(params.addresses);
    logBackupSuccess('buildLinkWalletEntries', {
      walletCount: linkEntries.length,
      chains: linkEntries.map(entry => entry.chain),
    });

    logBackupStep('linkWallets');
    await linkWallets({ wallets: linkEntries });
    logBackupSuccess('linkWallets');

    logBackupStep('wrapEncryptionKey (argon2id — may take ~1–2s)');
    const wrappedKey = await wrapEncryptionKey(
      params.passphrase,
      params.material.encryptionKey,
      floor,
    );
    logBackupSuccess('wrapEncryptionKey', {
      wrappedKeyBase64Len: wrappedKey.ciphertext.length,
      kdf: wrappedKey.kdf,
    });

    logBackupStep('buildBackupPayload');
    const payload = buildBackupPayload(
      {
        ...params.material,
        primaryEvmAddress,
      },
      wrappedKey,
    );
    logBackupSuccess('buildBackupPayload', {
      metadata: payload.metadata,
      blobSizes: describeBlobSizes({
        encryptedEntropy: payload.entropy,
        encryptedSeed: payload.seed,
        wrappedKeyCiphertext: payload.wrappedKey.ciphertext,
      }),
    });

    logBackupStep('putEntropySecret');
    await putEntropySecret(toEntropyPutRequest(payload));
    logBackupSuccess('putEntropySecret');

    logBackupStep('putSeedSecret');
    await putSeedSecret(toSeedPutRequest(payload));
    logBackupSuccess('putSeedSecret');

    logBackupSuccess('upload complete', { primaryEvmAddress });
    return { primaryEvmAddress };
  } catch (error) {
    logBackupError('upload failed', error);
    throw new Error(toUserFacingBackupError(error));
  }
}

export { BackendApiError };

export async function downloadBackendBackup(
  passphrase: string,
): Promise<DownloadBackendBackupResult> {
  logBackupStart('download started');

  try {
    logBackupStep('ensureBackendSession');
    await ensureBackendSession();
    logBackupSuccess('ensureBackendSession');

    logBackupStep('getEntropySecret');
    const entropySecret = await getEntropySecret();
    logBackupSuccess('getEntropySecret', {
      hasEntropy: Boolean(entropySecret.entropy),
      wordCount: entropySecret.metadata.wordCount,
      address: entropySecret.metadata.address,
    });

    logBackupStep('getSeedSecret');
    const seedSecret = await getSeedSecret();
    logBackupSuccess('getSeedSecret', {
      hasSeed: Boolean(seedSecret.seed),
    });

    if (!entropySecret.entropy) {
      throw new Error('No entropy backup found for this account');
    }

    if (!seedSecret.seed) {
      throw new Error('No seed backup found for this account');
    }

    logBackupStep('unwrapEncryptionKey', {
      cipher: entropySecret.wrappedKey.cipher,
      kdf: entropySecret.wrappedKey.kdf,
      ciphertextLen: entropySecret.wrappedKey.ciphertext.length,
    });
    const encryptionKey = await unwrapEncryptionKey(
      entropySecret.wrappedKey,
      passphrase,
    );
    logBackupSuccess('unwrapEncryptionKey');

    logBackupSuccess('download complete', {
      wordCount: entropySecret.metadata.wordCount,
    });

    return {
      encryptionKey,
      encryptedEntropy: entropySecret.entropy,
      encryptedSeed: seedSecret.seed,
      wordCount: entropySecret.metadata.wordCount,
    };
  } catch (error) {
    logBackupError('download failed', error);
    throw new Error(toUserFacingBackupError(error));
  }
}
