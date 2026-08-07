import { WorkletLifecycleService } from '@wdk-internal/services/workletLifecycleService';
import {
  getWalletStore,
  updateWalletLoadingState,
  type WalletState,
} from '@wdk-internal/store/walletStore';

// Clears in-memory seed/worklet state but keeps activeWalletId so unlock() can
// run the not_loaded -> loading -> ready path. WDK lock() clears activeWalletId
// and is meant for logout / wallet deletion, not session lock.
export function lockWdkWalletSession(): void {
  const walletStore = getWalletStore();
  const { activeWalletId, walletLoadingState } = walletStore.getState();

  if (!activeWalletId) {
    return;
  }

  if (
    walletLoadingState.type === 'loading' ||
    walletLoadingState.type === 'checking'
  ) {
    return;
  }

  WorkletLifecycleService.reset();

  walletStore.setState((prev: WalletState) => {
    if (prev.walletLoadingState.type === 'not_loaded') {
      return prev;
    }

    return updateWalletLoadingState(prev, { type: 'not_loaded' });
  });
}
