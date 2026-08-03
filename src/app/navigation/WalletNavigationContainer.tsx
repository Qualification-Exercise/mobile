import { useCallback, useEffect, useRef } from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useWdkApp } from '@tetherto/wdk-react-native-core';
import { RootNavigator } from './RootNavigator';
import type { RootStackParamList } from './types';

type WdkStatus = ReturnType<typeof useWdkApp>['state']['status'];

type WalletNavigationContainerProps = {
  initialRouteName: keyof RootStackParamList;
};

export function WalletNavigationContainer({
  initialRouteName,
}: WalletNavigationContainerProps) {
  const { state } = useWdkApp();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const previousStatusRef = useRef<WdkStatus | null>(null);

  const goHome = useCallback(() => {
    if (!navigationRef.isReady()) {
      return;
    }

    navigationRef.reset({ index: 0, routes: [{ name: 'Home' }] });
  }, [navigationRef]);

  const goSignIn = useCallback(() => {
    if (!navigationRef.isReady()) {
      return;
    }

    navigationRef.reset({ index: 0, routes: [{ name: 'SignIn' }] });
  }, [navigationRef]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    if (
      state.status === 'NO_WALLET' &&
      (previousStatus === 'READY' || previousStatus === 'LOCKED')
    ) {
      goSignIn();
    } else if (state.status === 'READY') {
      goHome();
    }

    previousStatusRef.current = state.status;
  }, [state.status, goHome, goSignIn]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        if (state.status === 'READY') {
          goHome();
        } else if (
          state.status === 'NO_WALLET' &&
          (previousStatusRef.current === 'READY' ||
            previousStatusRef.current === 'LOCKED')
        ) {
          goSignIn();
        }
      }}
    >
      <RootNavigator initialRouteName={initialRouteName} />
    </NavigationContainer>
  );
}
