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

    // useEffect(() => {
    //   const previousStatus = previousStatusRef.current;
    //
    //   if (
    //     state.status === 'READY' &&
    //     (previousStatus === 'LOCKED' || previousStatus === 'REINITIALIZING')
    //   ) {
    //     goHome();
    //   }
    //
    //   previousStatusRef.current = state.status;
    // }, [state.status, goHome]);

    return (
      <NavigationContainer ref={navigationRef}>
        <RootNavigator initialRouteName={navigationStore.bootRoute} />
      </NavigationContainer>
    );
  },
);
