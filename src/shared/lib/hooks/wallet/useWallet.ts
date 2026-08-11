import { useCallback, useMemo, useRef } from 'react';
import {
  useWalletManager,
  useWdkApp,
  type UseWalletManagerResult,
  type WalletInfo,
} from '@tetherto/wdk-react-native-core';
import { DEFAULT_WALLET_ID, MNEMONIC_WORD_COUNT } from './constants';
import { useEnsureWdkReady, type WdkStatus } from './useEnsureWdkReady';

/**
 * Whether the default wallet is present in the given wallet list.
 *
 * Note: this reads the WDK store's cached wallet list, which is persisted
 * separately from secure storage and is not the authoritative on-disk check.
 */
function isDefaultWalletPresent(wallets: WalletInfo[]): boolean {
  return wallets.some(
    wallet => wallet.identifier === DEFAULT_WALLET_ID && wallet.exists,
  );
}

/**
 * App-facing surface of the WDK wallet manager.
 *
 * This wrapper is intentionally single-wallet: every operation targets the
 * default wallet, so callers never pass a wallet id. It also folds the
 * mnemonic word count into `generateMnemonic`.
 *
 * `hasPersistedWallet` and `getStateStatus` are exposed as functions rather
 * than values so that async callers (e.g. after awaiting a biometric prompt)
 * read the latest data at call time instead of a value captured when their
 * closure was created.
 */
export interface UseWalletResult {
  /** Wallets known to the device (a cached view from the WDK store). */
  wallets: WalletInfo[];

  /** Snapshot of the wallets currently known to the device. */
  getWallets: () => WalletInfo[];

  /**
   * Whether the default wallet is present on this device, read live at call
   * time. Safe to call after an `await` without capturing a stale value.
   */
  hasPersistedWallet: () => boolean;

  /**
   * Current top-level WDK app status, read live at call time. Safe to call
   * after an `await` without capturing a stale value.
   */
  getStateStatus: () => WdkStatus;

  /**
   * Generate a fresh BIP-39 mnemonic for the app's word count.
   * @throws {WdkNotReadyError} If the WDK is busy or errored; the user is
   * alerted first.
   * @throws If entropy generation in the worklet fails.
   */
  generateMnemonic: () => Promise<string>;

  /**
   * Restore the default wallet from a mnemonic and set it active.
   * @param mnemonic - The BIP-39 recovery phrase to import.
   * @returns The restored wallet id.
   * @throws {WdkNotReadyError} If the WDK is busy or errored; the user is
   * alerted first.
   * @throws If a wallet already exists or the mnemonic is invalid.
   */
  restoreWallet: (mnemonic: string) => Promise<string>;

  /**
   * Unlock the default wallet, typically prompting device biometrics.
   * @throws {WdkNotReadyError} If the WDK is busy or errored; the user is
   * alerted first.
   * @throws If unlocking or biometric authentication fails.
   */
  unlock: () => Promise<void>;

  /**
   * Delete a wallet and all associated data.
   * @param walletId - Wallet to delete; defaults to the default wallet.
   * @throws {WdkNotReadyError} If the WDK is busy or errored; the user is
   * alerted first.
   * @throws If deletion from secure storage fails.
   */
  deleteWallet: (walletId?: string) => Promise<void>;

  /**
   * Read the default wallet's mnemonic, prompting biometrics when needed.
   * @returns The mnemonic, or `null` when none is stored.
   * @throws {WdkNotReadyError} If the WDK is busy or errored; the user is
   * alerted first.
   * @throws If secure-storage access or authentication fails.
   */
  getMnemonic: () => Promise<string | null>;

  /**
   * Derive seed and entropy from a mnemonic; used to validate a phrase.
   * @throws {WdkNotReadyError} If the WDK is busy or errored; the user is
   * alerted first.
   * @throws If the mnemonic cannot be processed by the worklet.
   */
  getSeedAndEntropyFromMnemonic: UseWalletManagerResult['getSeedAndEntropyFromMnemonic'];

  getEncryptionKey: () => Promise<string | null>;
  getEncryptedSeed: () => Promise<string | null>;
  getEncryptedEntropy: () => Promise<string | null>;
}

/**
 * Wrapper around `useWalletManager` scoped to the app's single default wallet.
 */
export function useWallet(): UseWalletResult {
  const {
    wallets,
    generateMnemonic: generateMnemonicRaw,
    restoreWallet: restoreWalletRaw,
    unlock: unlockRaw,
    deleteWallet: deleteWalletRaw,
    getMnemonic: getMnemonicRaw,
    getSeedAndEntropyFromMnemonic: getSeedAndEntropyFromMnemonicRaw,
    getEncryptionKey: getEncryptionKeyRaw,
    getEncryptedSeed: getEncryptedSeedRaw,
    getEncryptedEntropy: getEncryptedEntropyRaw,
  } = useWalletManager();
  const { state } = useWdkApp();

  // Mirror the latest reactive values into refs so the getters below can be
  // stable (no changing identity) yet still return fresh data when called from
  // an async continuation. Writing during render keeps render-time reads
  // current too.
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;
  const appStatusRef = useRef(state.status);
  appStatusRef.current = state.status;

  const getWallets = useCallback(() => walletsRef.current, []);

  const hasPersistedWallet = useCallback(
    () => isDefaultWalletPresent(walletsRef.current),
    [],
  );

  const getStateStatus = useCallback(() => appStatusRef.current, []);

  // Gate every wallet-manager operation on the live WDK status.
  const ensureWdkReady = useEnsureWdkReady();

  const generateMnemonic = useCallback(async () => {
    ensureWdkReady();
    return generateMnemonicRaw(MNEMONIC_WORD_COUNT);
  }, [ensureWdkReady, generateMnemonicRaw]);

  const restoreWallet = useCallback(
    async (mnemonic: string) => {
      ensureWdkReady();
      return restoreWalletRaw(mnemonic, DEFAULT_WALLET_ID);
    },
    [ensureWdkReady, restoreWalletRaw],
  );

  const unlock = useCallback(async () => {
    ensureWdkReady();
    return unlockRaw(DEFAULT_WALLET_ID);
  }, [ensureWdkReady, unlockRaw]);

  const deleteWallet = useCallback(
    async (walletId: string = DEFAULT_WALLET_ID) => {
      ensureWdkReady();
      return deleteWalletRaw(walletId);
    },
    [ensureWdkReady, deleteWalletRaw],
  );

  const getMnemonic = useCallback(async () => {
    ensureWdkReady();
    return getMnemonicRaw(DEFAULT_WALLET_ID);
  }, [ensureWdkReady, getMnemonicRaw]);

  const getSeedAndEntropyFromMnemonic = useCallback<
    UseWalletManagerResult['getSeedAndEntropyFromMnemonic']
  >(
    async mnemonic => {
      ensureWdkReady();
      return getSeedAndEntropyFromMnemonicRaw(mnemonic);
    },
    [ensureWdkReady, getSeedAndEntropyFromMnemonicRaw],
  );

  const getEncryptionKey = useCallback(async () => {
    ensureWdkReady();
    return getEncryptionKeyRaw(DEFAULT_WALLET_ID);
  }, [ensureWdkReady, getEncryptionKeyRaw]);

  const getEncryptedSeed = useCallback(async () => {
    ensureWdkReady();
    return getEncryptedSeedRaw(DEFAULT_WALLET_ID);
  }, [ensureWdkReady, getEncryptedSeedRaw]);

  const getEncryptedEntropy = useCallback(async () => {
    ensureWdkReady();
    return getEncryptedEntropyRaw(DEFAULT_WALLET_ID);
  }, [ensureWdkReady, getEncryptedEntropyRaw]);

  return useMemo(
    () => ({
      wallets,
      getWallets,
      hasPersistedWallet,
      getStateStatus,
      generateMnemonic,
      restoreWallet,
      unlock,
      deleteWallet,
      getMnemonic,
      getSeedAndEntropyFromMnemonic,
      getEncryptionKey,
      getEncryptedSeed,
      getEncryptedEntropy,
    }),
    [
      wallets,
      getWallets,
      hasPersistedWallet,
      getStateStatus,
      generateMnemonic,
      restoreWallet,
      unlock,
      deleteWallet,
      getMnemonic,
      getSeedAndEntropyFromMnemonic,
      getEncryptionKey,
      getEncryptedSeed,
      getEncryptedEntropy,
    ],
  );
}
