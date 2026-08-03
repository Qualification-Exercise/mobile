import { useEffect } from 'react';
import { useWalletManager } from '@tetherto/wdk-react-native-core';
import { useStore } from '@shared/store';

/** Binds WDK wallet manager APIs to `WalletSeedPhraseStore` (must render inside WdkAppProvider). */
export function WdkSeedPhraseBridge() {
  const walletManager = useWalletManager();
  const { walletSeedPhraseStore } = useStore();

  useEffect(() => {
    walletSeedPhraseStore.bind(walletManager);
    return () => walletSeedPhraseStore.unbind();
  }, [walletManager, walletSeedPhraseStore]);

  return null;
}
