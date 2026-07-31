/**
 * WDK Wallet
 *
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { observer } from 'mobx-react-lite';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';
import { RootStoreContext } from '@shared/store';
import { RootNavigator } from './navigation';
import { RootStore, WdkProvider } from './providers';

const rootStore = new RootStore();

// Configure Google Sign-In once, before any sign-in attempt is made.
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
});

// Restore any persisted session + biometry preference from the keychain on
// startup. Fire-and-forget: the UI reacts once both hydrations resolve.
rootStore.authStore.hydrate();
rootStore.biometryStore.hydrate();

const App = observer(function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const { authStore, biometryStore } = rootStore;

  // Wait for the keychain reads before mounting the navigator so the initial
  // route reflects the restored session and biometry state.
  if (!authStore.isHydrated || !biometryStore.isHydrated) {
    return null;
  }

  // Initial route resolution:
  //   - Not signed in            → SignIn
  //   - Signed in, biometry OK    → Home
  //   - Signed in, biometry off or permission not granted → EnableBiometric
  // Biometry is mandatory for authenticated users: if it is disabled or the OS
  // permission was never granted, we hold them on EnableBiometric so the app
  // cannot be used until they enable it.
  let initialRouteName: 'SignIn' | 'EnableBiometric' | 'Home';
  if (!authStore.isAuthenticated) {
    initialRouteName = 'SignIn';
  } else if (!biometryStore.isActive) {
    initialRouteName = 'EnableBiometric';
  } else {
    initialRouteName = 'Home';
  }

  return (
    <SafeAreaProvider>
      <WdkProvider>
        <RootStoreContext.Provider value={rootStore}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <NavigationContainer>
            <RootNavigator initialRouteName={initialRouteName} />
          </NavigationContainer>
        </RootStoreContext.Provider>
      </WdkProvider>
    </SafeAreaProvider>
  );
});

export default App;
