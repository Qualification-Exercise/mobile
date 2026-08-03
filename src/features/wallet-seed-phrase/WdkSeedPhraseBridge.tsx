import { useEffect } from 'react';
import { useWalletManager } from '@tetherto/wdk-react-native-core';
import { useStore } from '@shared/store';
import { DEFAULT_WALLET_ID } from './constants';
import { hasPersistedWallet } from './walletPresence';

/** Binds WDK wallet manager APIs to `WalletSeedPhraseStore` (must render inside WdkAppProvider). */
export function WdkSeedPhraseBridge() {
  const walletManager = useWalletManager();
  const { walletSeedPhraseStore } = useStore();

  useEffect(() => {
    walletSeedPhraseStore.bind(walletManager);
    return () => walletSeedPhraseStore.unbind();
  }, [walletManager, walletSeedPhraseStore]);

  // Heal MMKV state when a previous WDK lock() cleared activeWalletId but the
  // wallet still exists in secure storage.
  useEffect(() => {
    if (
      walletManager.activeWalletId ||
      !hasPersistedWallet(walletManager.wallets)
    ) {
      return;
    }

    walletManager.setActiveWalletId(DEFAULT_WALLET_ID);
  }, [walletManager]);

  return null;
}
