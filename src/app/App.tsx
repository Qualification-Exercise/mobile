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
import { RootStore } from './providers';

const rootStore = new RootStore();

// Configure Google Sign-In once, before any sign-in attempt is made.
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
});

// Restore any persisted session from the keychain on startup. Fire-and-forget:
// the UI reacts to `authStore` once hydration resolves.
rootStore.authStore.hydrate();

const App = observer(function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const { authStore } = rootStore;

  // Wait for the keychain read before mounting the navigator so the initial
  // route reflects the restored session. A returning user lands on
  // EnableBiometric; everyone else starts at SignIn.
  const initialRouteName = authStore.isAuthenticated
    ? 'EnableBiometric'
    : 'SignIn';

  return (
    <SafeAreaProvider>
      <RootStoreContext.Provider value={rootStore}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        {authStore.isHydrated && (
          <NavigationContainer>
            <RootNavigator initialRouteName={initialRouteName} />
          </NavigationContainer>
        )}
      </RootStoreContext.Provider>
    </SafeAreaProvider>
  );
});

export default App;
