/**
 * WDK Wallet
 *
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStoreContext } from '@shared/store';
import { RootNavigator } from './navigation';
import { RootStore, WdkProvider } from './providers';

const rootStore = new RootStore();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <WdkProvider>
        <RootStoreContext.Provider value={rootStore}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </RootStoreContext.Provider>
      </WdkProvider>
    </SafeAreaProvider>
  );
}

export default App;
