import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useWalletManager, useWdkApp } from '@tetherto/wdk-react-native-core';
import { useStore } from '@shared/store';
import { hasPersistedWallet } from './walletPresence';

type WalletSessionLockProps = {
  onRequireUnlock: () => void;
};

// Lock the WDK session when the app enters background. Cold start is already
// LOCKED after MMKV rehydrate; unlock only happens after biometry on
// BiometricUnlock. Do not lock on `inactive` alone — that state is also used
// for the system Face ID sheet during in-app biometry.
function WalletSessionLockView({ onRequireUnlock }: WalletSessionLockProps) {
  const { state } = useWdkApp();
  const { wallets } = useWalletManager();
  const { authStore, biometryStore, walletSeedPhraseStore } = useStore();
  const pendingUnlockRef = useRef(false);

  const persistedWalletExists = hasPersistedWallet(wallets);
  const mayUseWallet =
    authStore.isAuthenticated &&
    biometryStore.isEnrolled &&
    persistedWalletExists;

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          !mayUseWallet ||
          !walletSeedPhraseStore.isBridgeReady ||
          state.status === 'NO_WALLET'
        ) {
          return;
        }

        if (nextState === 'background') {
          if (state.status === 'READY') {
            walletSeedPhraseStore.lockWalletSession();
            pendingUnlockRef.current = true;
          }
          return;
        }

        if (nextState === 'active' && pendingUnlockRef.current) {
          pendingUnlockRef.current = false;
          onRequireUnlock();
        }
      },
    );

    return () => subscription.remove();
  }, [mayUseWallet, walletSeedPhraseStore, state.status, onRequireUnlock]);

  return null;
}

export const WalletSessionLock = observer(WalletSessionLockView);
