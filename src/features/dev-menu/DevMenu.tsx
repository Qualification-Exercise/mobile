import { useEffect, useRef } from 'react';
import { Alert, DevSettings } from 'react-native';
import { useWalletManager } from '@tetherto/wdk-react-native-core';
import { useStore } from '@shared/store';
import { DEFAULT_WALLET_ID } from '@features/wallet-seed-phrase';

const MENU_ITEM_TITLE = 'Clear all cached data';

export function DevMenu() {
  const { authStore, biometryStore } = useStore();
  const { wallets, deleteWallet } = useWalletManager();

  // Hold the latest wipe logic in a ref: `DevSettings.addMenuItem` registers a
  // handler once and cannot update it, so we must avoid capturing a stale
  // closure over `wallets`/`deleteWallet`.
  const clearRef = useRef<() => Promise<void>>(() => Promise.resolve());
  clearRef.current = async () => {
    // Delete every known wallet plus the default id, which may still hold
    // secure-storage material even when the in-memory wallet list is empty.
    const walletIds = new Set([
      DEFAULT_WALLET_ID,
      ...wallets.map((wallet) => wallet.identifier),
    ]);

    await Promise.allSettled([
      authStore.signOut(),
      biometryStore.reset(),
      ...[...walletIds].map((walletId) => deleteWallet(walletId)),
    ]);
  };

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    DevSettings.addMenuItem(MENU_ITEM_TITLE, () => {
      clearRef
        .current()
        .then(() => DevSettings.reload())
        .catch((error) => {
          Alert.alert('Clear cached data failed', String(error));
        });
    });
  }, []);

  return null;
}
