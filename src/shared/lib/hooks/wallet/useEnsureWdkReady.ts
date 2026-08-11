import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import {
  useWalletManager,
  useWdkApp,
  type UseWalletManagerResult,
  type WdkAppState,
} from '@tetherto/wdk-react-native-core';

// Top-level WDK app status, e.g. `'LOCKED' | 'READY' | 'NO_WALLET'`.
export type WdkStatus = WdkAppState['status'];

// Active-wallet status reported by the WDK wallet manager.
export type WalletManagerStatus = UseWalletManagerResult['status'];

// Thrown by wallet operations when the WDK app or wallet manager is not in a
// state that can service the request (still initializing, busy, or errored).
// The user has already been alerted by the time this is thrown; callers can
// treat it as a signal to abort silently rather than surface a second error.
export class WdkNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WdkNotReadyError';
  }
}

// Copy shown when the WDK is momentarily busy (initializing/reinitializing or
// the manager is loading). There is no user action to take but wait.
const WDK_BUSY_ALERT = {
  title: 'Please wait',
  message:
    "The wallet is still getting ready. Can't process further right now — " +
    'please try again in a moment.',
} as const;

// Copy shown when the WDK is in an error state. Recovery requires
// reinitializing, so the alert offers a retry.
const WDK_ERROR_ALERT = {
  title: 'Wallet unavailable',
  message:
    'The wallet ran into a problem and needs to reinitialize before you can ' +
    'continue.',
} as const;

// Non-alerting, reactive readiness flag sharing the same status source as
// `useEnsureWdkReady`. Use this to gate read-only paths (e.g. fee estimation)
// that must never surface an alert. Unlike the guard below, this is a plain
// reactive boolean so effects can depend on it and re-run when readiness flips.
export function useIsWdkReady(): boolean {
  const { status: managerStatus } = useWalletManager();
  const { state } = useWdkApp();

  return (
    state.status !== 'ERROR' &&
    state.status !== 'INITIALIZING' &&
    state.status !== 'REINITIALIZING' &&
    managerStatus !== 'ERROR' &&
    managerStatus !== 'LOADING'
  );
}

// Returns a stable guard that gates an operation on the live WDK status. Reads
// from refs so the guard stays valid after an `await` (e.g. a biometric
// prompt) instead of using a value captured when the closure was created.
//
// This guard alerts the user as a side effect, so reserve it for user-driven
// writes (e.g. signing a send). Read-only, best-effort paths should gate on
// `useIsWdkReady()` instead, which never alerts.
export function useEnsureWdkReady(): () => void {
  const { status: managerStatus } = useWalletManager();
  const { state, retry } = useWdkApp();

  const appStatusRef = useRef(state.status);
  appStatusRef.current = state.status;
  const managerStatusRef = useRef(managerStatus);
  managerStatusRef.current = managerStatus;
  const retryRef = useRef(retry);
  retryRef.current = retry;

  return useCallback(() => {
    const appStatus = appStatusRef.current;
    const walletManagerStatus = managerStatusRef.current;

    // Errored: recoverable only by reinitializing, so offer a retry.
    if (appStatus === 'ERROR' || walletManagerStatus === 'ERROR') {
      Alert.alert(WDK_ERROR_ALERT.title, WDK_ERROR_ALERT.message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => retryRef.current() },
      ]);
      throw new WdkNotReadyError(WDK_ERROR_ALERT.message);
    }

    // Transient: initializing/reinitializing or the manager is mid-operation.
    // Nothing to do but wait, so surface a common "busy" notice.
    if (
      appStatus === 'INITIALIZING' ||
      appStatus === 'REINITIALIZING' ||
      walletManagerStatus === 'LOADING'
    ) {
      Alert.alert(WDK_BUSY_ALERT.title, WDK_BUSY_ALERT.message);
      throw new WdkNotReadyError(WDK_BUSY_ALERT.message);
    }
  }, []);
}
