import {useEffect, useRef, useState} from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { observer } from 'mobx-react-lite';
import { Alert, DevSettings, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';
import {RootStoreContext, useStore} from '@shared/store';
import { WalletNavigationContainer } from './navigation/WalletNavigationContainer';
import {RootStore, useSyncAppState, useSyncWdkAppState} from './providers';
import { WdkAppProvider, useWalletManager } from '@tetherto/wdk-react-native-core';
import { bundle } from '../../.wdk';
import {WdkSeedPhraseBridge, DEFAULT_WALLET_ID} from '@features/wallet-seed-phrase';
import {wdkConfigs} from '@shared/config';
import {reaction} from 'mobx';


const MENU_ITEM_TITLE = 'Clear all cached data';

function DevMenu() {
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


const rootStore = new RootStore();

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
});

rootStore.authStore.hydrate();
rootStore.biometryStore.hydrate();

const App = observer(function App() {
  // FIXME: Move to separate component to prevent extra reconciliation
  useSyncAppState();
  useSyncWdkAppState();

  return <>
    <DevMenu />
    <WdkSeedPhraseBridge />
    <WalletNavigationContainer />
  </>
})

const AppRoot = observer(function AppRoot() {
  const isDarkMode = useColorScheme() === 'dark';
  const { authStore, biometryStore } = rootStore;

  if (!authStore.isHydrated || !biometryStore.isHydrated) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootStoreContext.Provider value={rootStore}>
        <WdkAppProvider bundle={{ bundle }} wdkConfigs={wdkConfigs}>
          <App />
        </WdkAppProvider>
      </RootStoreContext.Provider>
    </SafeAreaProvider>
  );
});

export default AppRoot;
