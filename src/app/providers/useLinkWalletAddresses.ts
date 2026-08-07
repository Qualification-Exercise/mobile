import { useEffect } from 'react';
import { useAddresses, useWdkApp } from '@tetherto/wdk-react-native-core';
import type { NetworkName } from '../../../.wdk';
import { walletsApi, type LinkedWalletDTO } from '@shared/api';
import { SUPPORTED_NETWORKS, getSrcChainId } from '@shared/config';
import { useStore } from '@shared/store';

// Once the wallet is READY (and the user is authenticated), register the
// derived per-chain addresses with the backend and retry any queued
// transaction reports. Both are best-effort: failures are logged, never
// surfaced, so an unauthenticated or offline session degrades gracefully.
export function useLinkWalletAddresses() {
  const { state } = useWdkApp();
  const { loadAddresses } = useAddresses();
  const { walletStore, authStore } = useStore();

  useEffect(() => {
    if (state.status !== 'READY' || !authStore.isAuthenticated) {
      return;
    }

    let cancelled = false;

    (async () => {
      // Link derived addresses once per session (deduped via a store flag).
      if (!walletStore.addressesLinked) {
        try {
          // Use the resolved results directly rather than a store getter — the
          // getter's snapshot is captured before this load populates it.
          const results = await loadAddresses([0], SUPPORTED_NETWORKS);
          if (cancelled) {
            return;
          }

          const wallets: LinkedWalletDTO[] = [];
          for (const result of results) {
            if (result.success) {
              wallets.push({
                chain: result.network,
                srcChainId: getSrcChainId(result.network as NetworkName),
                address: result.address,
              });
            }
          }

          // The backend requires an EVM address (cashback payout recipient).
          const hasEvmAddress = wallets.some(
            wallet => wallet.srcChainId != null,
          );
          if (hasEvmAddress) {
            await walletsApi.link({ wallets });
            if (!cancelled) {
              walletStore.markAddressesLinked();
            }
          }
        } catch (error) {
          console.warn('Wallet address linking failed (best-effort)', error);
        }
      }

      // Retry any transaction reports that failed to reach the backend.
      if (!cancelled) {
        await walletStore.flushPendingReports();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.status, authStore.isAuthenticated, walletStore, loadAddresses]);
}
