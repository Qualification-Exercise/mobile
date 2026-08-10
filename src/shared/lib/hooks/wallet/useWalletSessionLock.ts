import { useEffect } from 'react';
import { reaction } from 'mobx';
import { useStore } from '@shared/store';
import { lockWdkWalletSession } from './wdkSessionLock';

// Lock the WDK session when the app enters background, and require a biometric
// re-unlock when it returns to the foreground. Cold start is already LOCKED
// after MMKV rehydrate (no AppState change fires, so this stays out of that
// path). Locking only happens from `background` — never `inactive` alone, which
// is also the state of the system Face ID sheet during in-app biometry.
//
// The single native AppState listener lives in `useSyncAppState`, which feeds
// `appStateStore`. This hook only reacts to that store, so there is no second
// listener and no re-render: the MobX `reaction` runs its effect outside React.
//
// Re-unlock is driven off `wdkAppStore.status` rather than a local "did we
// lock" flag — the background lock flips the status to LOCKED, so "became
// active while LOCKED" is the unlock signal. That is also robust to iOS's
// `background -> inactive -> active` return path, where the immediate previous
// state is `inactive`, not `background`.
export function useWalletSessionLock(): void {
  const {
    appStateStore,
    authStore,
    biometryStore,
    navigationStore,
    wdkAppStore,
  } = useStore();

  useEffect(
    () =>
      reaction(
        () => appStateStore.state,
        () => {
          const mayUseWallet =
            authStore.isAuthenticated &&
            biometryStore.isEnrolled &&
            wdkAppStore.hasWallet;

          if (!mayUseWallet) {
            return;
          }

          if (
            appStateStore.isAppInBackground &&
            wdkAppStore.status === 'READY'
          ) {
            lockWdkWalletSession();
            return;
          }

          if (appStateStore.isActive && wdkAppStore.status === 'LOCKED') {
            navigationStore.goToBiometricUnlock();
          }
        },
      ),
    [appStateStore, authStore, biometryStore, navigationStore, wdkAppStore],
  );
}
