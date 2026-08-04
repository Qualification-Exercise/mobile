import {useEffect, useState} from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { observer } from 'mobx-react-lite';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';
import {RootStoreContext, useStore} from '@shared/store';
import { WalletNavigationContainer } from './navigation/WalletNavigationContainer';
import {RootStore, useSyncAppState, useSyncWdkAppState} from './providers';
import { WdkAppProvider } from '@tetherto/wdk-react-native-core';
import { bundle } from '../../.wdk';
import {WdkSeedPhraseBridge} from '@features/wallet-seed-phrase';
import {wdkConfigs} from '@shared/config';
import {reaction} from 'mobx';


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
