import { useCallback, useMemo, useRef } from 'react';
import {
  useWalletManager,
  useWdkApp,
  type UseWalletManagerResult,
  type WalletInfo,
  type WdkAppState,
} from '@tetherto/wdk-react-native-core';
import { DEFAULT_WALLET_ID, MNEMONIC_WORD_COUNT } from './constants';

/** Top-level WDK app status, e.g. `'LOCKED' | 'READY' | 'NO_WALLET'`. */
export type WdkStatus = WdkAppState['status'];

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
   * @throws If entropy generation in the worklet fails.
   */
  generateMnemonic: () => Promise<string>;

  /**
   * Restore the default wallet from a mnemonic and set it active.
   * @param mnemonic - The BIP-39 recovery phrase to import.
   * @returns The restored wallet id.
   * @throws If a wallet already exists or the mnemonic is invalid.
   */
  restoreWallet: (mnemonic: string) => Promise<string>;

  /**
   * Unlock the default wallet, typically prompting device biometrics.
   * @throws If unlocking or biometric authentication fails.
   */
  unlock: () => Promise<void>;

  /**
   * Delete a wallet and all associated data.
   * @param walletId - Wallet to delete; defaults to the default wallet.
   * @throws If deletion from secure storage fails.
   */
  deleteWallet: (walletId?: string) => Promise<void>;

  /**
   * Read the default wallet's mnemonic, prompting biometrics when needed.
   * @returns The mnemonic, or `null` when none is stored.
   * @throws If secure-storage access or authentication fails.
   */
  getMnemonic: () => Promise<string | null>;

  /**
   * Derive seed and entropy from a mnemonic; used to validate a phrase.
   * @throws If the mnemonic cannot be processed by the worklet.
   */
  getSeedAndEntropyFromMnemonic: UseWalletManagerResult['getSeedAndEntropyFromMnemonic'];
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
    getSeedAndEntropyFromMnemonic,
  } = useWalletManager();
  const { state } = useWdkApp();

  // Mirror the latest reactive values into refs so the getters below can be
  // stable (no changing identity) yet still return fresh data when called from
  // an async continuation. Writing during render keeps render-time reads
  // current too.
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  const getWallets = useCallback(() => walletsRef.current, []);

  const hasPersistedWallet = useCallback(
    () => isDefaultWalletPresent(walletsRef.current),
    [],
  );

  const getStateStatus = useCallback(() => statusRef.current, []);

  const generateMnemonic = useCallback(
    () => generateMnemonicRaw(MNEMONIC_WORD_COUNT),
    [generateMnemonicRaw],
  );

  const restoreWallet = useCallback(
    (mnemonic: string) => restoreWalletRaw(mnemonic, DEFAULT_WALLET_ID),
    [restoreWalletRaw],
  );

  const unlock = useCallback(() => unlockRaw(DEFAULT_WALLET_ID), [unlockRaw]);

  const deleteWallet = useCallback(
    (walletId: string = DEFAULT_WALLET_ID) => deleteWalletRaw(walletId),
    [deleteWalletRaw],
  );

  const getMnemonic = useCallback(
    () => getMnemonicRaw(DEFAULT_WALLET_ID),
    [getMnemonicRaw],
  );

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
    ],
  );
}
