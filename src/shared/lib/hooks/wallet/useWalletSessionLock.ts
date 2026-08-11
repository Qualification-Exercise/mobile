import { useEffect, useRef } from 'react';
import { comparer, reaction } from 'mobx';
import { useStore } from '@shared/store';
import { lockWdkWalletSession } from './wdkSessionLock';

// Lock the WDK session when the app enters background, and require a biometric
// re-unlock when it returns to the foreground. Cold start is already LOCKED
// after MMKV rehydrate (no AppState change fires, so this stays out of that
// path). Locking only happens from `background` — never `inactive` alone, which
// is also the state of the system Face ID sheet during in-app biometry.
//
// The single native AppState listener lives in `useSyncAppState`, which feeds
// `appStateStore`. This hook reacts to that store and authentication state, so
// there is no second native listener and no re-render: MobX reactions run their
// effects outside React. Signing out also clears the in-memory WDK session but
// preserves the persisted wallet for biometric unlock after the next sign-in.
//
// Re-unlock is requested only when this hook actually locked a READY wallet in
// the background. In particular, `inactive -> active` from the system Face ID
// sheet must not reopen BiometricUnlock while its own prompt is completing.
export function useWalletSessionLock(): void {
  const {
    appStateStore,
    authStore,
    biometryStore,
    navigationStore,
    wdkAppStore,
  } = useStore();
  const unlockRequiredAfterBackground = useRef(false);

  useEffect(() => {
    const disposeAppStateReaction = reaction(
      () => [appStateStore.state, wdkAppStore.status] as const,
      () => {
        const mayUseWallet =
          authStore.isAuthenticated &&
          biometryStore.isEnrolled &&
          wdkAppStore.hasWallet;

        if (!mayUseWallet) {
          unlockRequiredAfterBackground.current = false;
          return;
        }

        if (appStateStore.isAppInBackground && wdkAppStore.status === 'READY') {
          unlockRequiredAfterBackground.current = lockWdkWalletSession();
          return;
        }

        if (
          unlockRequiredAfterBackground.current &&
          appStateStore.isActive &&
          wdkAppStore.status === 'LOCKED'
        ) {
          unlockRequiredAfterBackground.current = false;
          navigationStore.goToBiometricUnlock();
        }
      },
      { equals: comparer.structural },
    );
    const disposeAuthReaction = reaction(
      () => authStore.isAuthenticated,
      isAuthenticated => {
        if (!isAuthenticated && wdkAppStore.status === 'READY') {
          lockWdkWalletSession();
        }
      },
    );

    return () => {
      disposeAppStateReaction();
      disposeAuthReaction();
    };
  }, [appStateStore, authStore, biometryStore, navigationStore, wdkAppStore]);
}
