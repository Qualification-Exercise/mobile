/**
 * WDK Wallet
 *
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <RootStoreContext.Provider value={rootStore}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </RootStoreContext.Provider>
    </SafeAreaProvider>
  );
}

export default App;
