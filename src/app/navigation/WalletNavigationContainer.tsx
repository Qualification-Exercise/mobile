import { useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useWalletManager, useWdkApp } from '@tetherto/wdk-react-native-core';
import { hasPersistedWallet } from '@features/wallet-seed-phrase/walletPresence';
import { WalletSessionLock } from '@features/wallet-seed-phrase';
import { useStore } from '@shared/store';
import { RootNavigator } from './RootNavigator';
import { resolveBootRoute } from './resolveBootRoute';
import type { RootStackParamList } from './types';

type WdkStatus = ReturnType<typeof useWdkApp>['state']['status'];

export const WalletNavigationContainer = observer(
  function WalletNavigationContainerView() {
    const { state } = useWdkApp();
    const { wallets } = useWalletManager();
    const { authStore, biometryStore, walletSeedPhraseStore } = useStore();
    const navigationRef = useNavigationContainerRef<RootStackParamList>();
    const previousStatusRef = useRef<WdkStatus | null>(null);
    const lastDeleteSignalRef = useRef(
      walletSeedPhraseStore.walletDeletedSignal,
    );
    const bootRouteRef = useRef<keyof RootStackParamList | null>(null);

    const persistedWalletExists = hasPersistedWallet(wallets);

    const bootRoute =
      state.status === 'INITIALIZING' || state.status === 'REINITIALIZING'
        ? null
        : resolveBootRoute({
            isAuthenticated: authStore.isAuthenticated,
            isBiometryEnrolled: biometryStore.isEnrolled,
            persistedWalletExists,
          });

    if (bootRouteRef.current === null && bootRoute !== null) {
      bootRouteRef.current = bootRoute;
    }

    const initialRouteName = bootRouteRef.current ?? 'SignIn';

    const goToSignIn = useCallback(() => {
      if (!navigationRef.isReady()) {
        return;
      }

      navigationRef.reset({ index: 0, routes: [{ name: 'SignIn' }] });
    }, [navigationRef]);

    const goHome = useCallback(() => {
      if (!navigationRef.isReady()) {
        return;
      }

      navigationRef.reset({ index: 0, routes: [{ name: 'Home' }] });
    }, [navigationRef]);

    const goToBiometricUnlock = useCallback(() => {
      if (!navigationRef.isReady()) {
        return;
      }

      navigationRef.reset({
        index: 0,
        routes: [{ name: 'BiometricUnlock', params: { autoPrompt: true } }],
      });
    }, [navigationRef]);

    useEffect(() => {
      const previousStatus = previousStatusRef.current;

      if (
        state.status === 'READY' &&
        (previousStatus === 'LOCKED' || previousStatus === 'REINITIALIZING')
      ) {
        goHome();
      }

      previousStatusRef.current = state.status;
    }, [state.status, goHome]);

    useEffect(() => {
      if (
        walletSeedPhraseStore.walletDeletedSignal ===
        lastDeleteSignalRef.current
      ) {
        return;
      }

      lastDeleteSignalRef.current = walletSeedPhraseStore.walletDeletedSignal;

      authStore.signOut().finally(() => {
        goToSignIn();
      });
    }, [walletSeedPhraseStore.walletDeletedSignal, authStore, goToSignIn]);

    if (bootRoute === null) {
      return null;
    }

    return (
      <NavigationContainer ref={navigationRef}>
        <WalletSessionLock onRequireUnlock={goToBiometricUnlock} />
        <RootNavigator initialRouteName={initialRouteName} />
      </NavigationContainer>
    );
  },
);
