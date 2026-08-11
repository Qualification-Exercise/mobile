import { WorkletLifecycleService } from '@wdk-internal/services/workletLifecycleService';
import {
  getWalletStore,
  updateWalletLoadingState,
  type WalletState,
} from '@wdk-internal/store/walletStore';

// Clears in-memory seed/worklet state but keeps activeWalletId so unlock() can
// run the not_loaded -> loading -> ready path. WDK lock() clears activeWalletId
// and is meant for logout / wallet deletion, not session lock.
export function lockWdkWalletSession(): boolean {
  const walletStore = getWalletStore();
  const { activeWalletId, walletLoadingState } = walletStore.getState();

  if (!activeWalletId) {
    return false;
  }

  if (
    walletLoadingState.type === 'loading' ||
    walletLoadingState.type === 'checking'
  ) {
    return false;
  }

  if (walletLoadingState.type === 'not_loaded') {
    return false;
  }

  WorkletLifecycleService.reset();

  walletStore.setState((prev: WalletState) => {
    return updateWalletLoadingState(prev, { type: 'not_loaded' });
  });

  return true;
}
