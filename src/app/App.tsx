import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { observer } from 'mobx-react-lite';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';
import { RootStoreContext } from '@shared/store';
import { WalletNavigationContainer } from './navigation/WalletNavigationContainer';
import type { RootStackParamList } from './navigation/types';
import { RootStore, WdkProvider } from './providers';

const rootStore = new RootStore();

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
});

rootStore.authStore.hydrate();
rootStore.biometryStore.hydrate();

const App = observer(function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const { authStore, biometryStore } = rootStore;

  if (!authStore.isHydrated || !biometryStore.isHydrated) {
    return null;
  }

  let initialRouteName: keyof RootStackParamList;
  if (!authStore.isAuthenticated) {
    initialRouteName = 'SignIn';
  } else if (!biometryStore.isEnrolled) {
    initialRouteName = 'EnableBiometric';
  } else {
    initialRouteName = 'BiometricUnlock';
  }

  return (
    <SafeAreaProvider>
      <RootStoreContext.Provider value={rootStore}>
        <WdkProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <WalletNavigationContainer initialRouteName={initialRouteName} />
        </WdkProvider>
      </RootStoreContext.Provider>
    </SafeAreaProvider>
  );
});

export default App;
