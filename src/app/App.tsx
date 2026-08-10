import { useEffect, useRef } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { observer } from 'mobx-react-lite';
import {
  Alert,
  DevSettings,
  LogBox,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { RootErrorBoundary, toastConfig } from '@shared/ui';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';
import { RootStoreContext, useStore } from '@shared/store';
import { WalletNavigationContainer } from './navigation/WalletNavigationContainer';
import { RootStore, useSyncAppState, useSyncWdkAppState } from './providers';
import { useLinkWalletAddresses } from '@shared/lib';
import { WdkAppProvider } from '@tetherto/wdk-react-native-core';
import { bundle } from '../../.wdk';
import {
  DEFAULT_WALLET_ID,
  useWallet,
  useWalletSessionLock,
} from '@shared/lib/hooks/wallet';
import { wdkConfigs } from '@shared/config';

const MENU_ITEM_TITLE = 'Clear all cached data';
const DEV_MENU_ITEM_TITLE = 'Dev Menu';

// WDK logs a per-asset balance failure via `console.error`, which in dev raises
// a full-screen LogBox overlay that blocks the UI whenever one network is
// unreachable or rate-limited (e.g. a TronGrid 429). The failure is already
// handled — the affected asset just shows "—" — so it should not take over the
// screen. Warnings/errors still print to the console; only the overlay is
// suppressed, and only for this specific, already-handled message.
if (__DEV__) {
  LogBox.ignoreLogs([/Failed to fetch balance for/]);
}

function DevMenu() {
  const { authStore, biometryStore, navigationStore } = useStore();
  const { getWallets, deleteWallet } = useWallet();

  // Hold the latest wipe logic in a ref: `DevSettings.addMenuItem` registers a
  // handler once and cannot update it, so we must avoid capturing a stale
  // closure over `getWallets`/`deleteWallet`.
  const clearRef = useRef<() => Promise<void>>(() => Promise.resolve());
  clearRef.current = async () => {
    // Delete every known wallet plus the default id, which may still hold
    // secure-storage material even when the in-memory wallet list is empty.
    const walletIds = new Set([
      DEFAULT_WALLET_ID,
      ...getWallets().map(wallet => wallet.identifier),
    ]);

    await Promise.allSettled([
      authStore.signOut(),
      biometryStore.reset(),
      ...[...walletIds].map(walletId => deleteWallet(walletId)),
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
        .catch(error => {
          Alert.alert('Clear cached data failed', String(error));
        });
    });

    DevSettings.addMenuItem(DEV_MENU_ITEM_TITLE, () =>
      navigationStore.goToDevMenu(),
    );
  }, [navigationStore]);

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
  useSyncAppState();
  useSyncWdkAppState();
  useWalletSessionLock();
  useLinkWalletAddresses();

  return (
    <>
      <DevMenu />
      <WalletNavigationContainer />
    </>
  );
});

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
        <RootErrorBoundary>
          <WdkAppProvider bundle={{ bundle }} wdkConfigs={wdkConfigs}>
            <App />
          </WdkAppProvider>
        </RootErrorBoundary>
      </RootStoreContext.Provider>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
});

export default AppRoot;
