import { useCallback, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useStore } from '@shared/store';
import { RootNavigator } from './RootNavigator';
import type { RootStackParamList } from './types';

export const WalletNavigationContainer = observer(
  function WalletNavigationContainerView() {
    const { navigationStore } = useStore();
    const navigationRef = useNavigationContainerRef<RootStackParamList>();

    useEffect(() => {
      navigationStore.setNavigationRef(navigationRef);
    }, [navigationStore, navigationRef]);

    const handleStateChange = useCallback(() => {
      const routeName = navigationRef.getCurrentRoute()?.name as
        | keyof RootStackParamList
        | undefined;

      navigationStore.setActiveRouteName(routeName);
    }, [navigationStore, navigationRef]);

    return (
      <NavigationContainer
        ref={navigationRef}
        onReady={handleStateChange}
        onStateChange={handleStateChange}
      >
        <RootNavigator initialRouteName={navigationStore.bootRoute} />
      </NavigationContainer>
    );
  },
);
