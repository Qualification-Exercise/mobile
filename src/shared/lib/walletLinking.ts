import { useEffect } from 'react';
import { useAddresses, useWdkApp } from '@tetherto/wdk-react-native-core';
import type { NetworkName } from '../../../.wdk';
import { walletsApi, type LinkedWalletDTO } from '@shared/api';
import {
  SUPPORTED_NETWORKS,
  getChainKind,
  getSrcChainId,
} from '@shared/config';
import { useStore } from '@shared/store';
import type { WalletStore } from '@shared/store/domains';

type LoadAddresses = ReturnType<typeof useAddresses>['loadAddresses'];

// Register the wallet's derived addresses with the backend and record what the
// backend ended up with, in `walletStore.linkedEvmAddress`.
//
// Runs on every transition into READY rather than once per session: a wallet
// created or restored after sign-in derives new addresses under the same
// wallet id, and a stale "already linked" flag would leave that wallet
// unlinked until the next cold start. Re-posting the same address is a no-op
// on the backend, so repeating is cheap and always safe.
//
// Never throws — the caller treats linking as best-effort and the payment gate
// reads `linkedEvmAddress` to decide whether spending is safe.
export async function linkWalletAddresses(
  loadAddresses: LoadAddresses,
  walletStore: WalletStore,
): Promise<void> {
  try {
    const results = await loadAddresses([0], SUPPORTED_NETWORKS);

    // One record per chain family, not per network: the backend keys a wallet
    // on `chain`, so the three EVM networks collapse into a single `evm`
    // record. Sending all three is a 400 DUPLICATE_CHAIN that fails the whole
    // request. First wins, and `SUPPORTED_NETWORKS` lists `ethereum` (Sepolia)
    // first among the EVM ones — the network the demo merchant settles on.
    const byChain = new Map<string, LinkedWalletDTO>();
    for (const result of results) {
      if (result.success) {
        const network = result.network as NetworkName;
        const chain = getChainKind(network);
        if (!byChain.has(chain)) {
          byChain.set(chain, {
            chain,
            srcChainId: getSrcChainId(network),
            address: result.address,
          });
        }
      }
    }

    // The backend requires an EVM address (cashback payout recipient).
    if (byChain.has('evm')) {
      await walletsApi.link({ wallets: [...byChain.values()] });
    }
  } catch (error) {
    // Linking can fail with a conflict (a different address is already bound
    // to this account, and there is no reset endpoint). The read below is what
    // decides whether paying is safe, so swallow here and let the address
    // comparison speak.
    console.warn('Wallet address linking failed', error);
  }

  // Always read back what the backend actually has: a payment from any other
  // address is dropped as `ignored` and never reprocessed.
  try {
    const linked = await walletsApi.list();
    const evm = linked.find(wallet => wallet.chain === 'evm');
    walletStore.setLinkedEvmAddress(evm?.address ?? null);
  } catch (error) {
    console.warn('Reading linked wallets failed', error);
    walletStore.setLinkedEvmAddress(null);
  }
}

// Once the wallet is READY (and the user is authenticated), link its derived
// addresses and retry any queued transaction reports. Both are best-effort:
// failures are logged, never surfaced, so an unauthenticated or offline
// session degrades gracefully.
export function useLinkWalletAddresses() {
  const { state } = useWdkApp();
  const { loadAddresses } = useAddresses();
  const { walletStore, authStore } = useStore();

  // READY carries the active wallet id, so a wallet created or restored mid
  // session re-runs this effect instead of waiting for a restart.
  const walletId = state.status === 'READY' ? state.walletId : null;

  useEffect(() => {
    if (!walletId || !authStore.isAuthenticated) {
      return;
    }

    let cancelled = false;

    (async () => {
      await linkWalletAddresses(loadAddresses, walletStore);

      // Retry any transaction reports that failed to reach the backend.
      if (!cancelled) {
        await walletStore.flushPendingReports();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [walletId, authStore.isAuthenticated, walletStore, loadAddresses]);
}
