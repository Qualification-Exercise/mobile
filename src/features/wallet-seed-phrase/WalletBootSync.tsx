import { useEffect, useRef } from 'react';
import { useWalletManager, useWdkApp } from '@tetherto/wdk-react-native-core';
import { useStore } from '@shared/store';
import { DEFAULT_WALLET_ID } from './constants';

/**
 * On cold start, probe secure storage when MMKV lost activeWalletId but keychain
 * still has a wallet (NO_WALLET). LOCKED is handled in WdkGate with an explicit
 * unlock action — do not auto-unlock here (causes spinner loops and post-delete races).
 */
export function WalletBootSync() {
  const { state } = useWdkApp();
  const { wallets } = useWalletManager();
  const { walletSeedPhraseStore } = useStore();
  const probeAttempted = useRef(false);

  const hasPersistedWallet = wallets.some(
    wallet => wallet.identifier === DEFAULT_WALLET_ID && wallet.exists,
  );

  useEffect(() => {
    if (state.status === 'READY' || state.status === 'NO_WALLET') {
      probeAttempted.current = false;
    }
  }, [state.status]);

  useEffect(() => {
    if (
      state.status === 'INITIALIZING' ||
      state.status === 'REINITIALIZING' ||
      state.status === 'ERROR' ||
      state.status === 'READY' ||
      state.status === 'LOCKED'
    ) {
      return;
    }

    if (walletSeedPhraseStore.skipBootUnlock || !hasPersistedWallet) {
      return;
    }

    if (state.status === 'NO_WALLET' && !probeAttempted.current) {
      probeAttempted.current = true;
      void walletSeedPhraseStore.unlockWalletRequest
        .fetch(DEFAULT_WALLET_ID)
        .catch(() => {
          probeAttempted.current = false;
        });
    }
  }, [state, walletSeedPhraseStore, hasPersistedWallet]);

  return null;
}
