import { useCallback, useMemo } from 'react';
import {
  BaseAsset,
  useAccount,
  type TransactionResult,
} from '@tetherto/wdk-react-native-core';
import { getAssetConfig } from '@shared/config';
import { useEnsureWdkReady, useIsWdkReady } from './useEnsureWdkReady';

// Fee estimate for a transfer (a send result without the broadcast hash).
export type FeeEstimate = Omit<TransactionResult, 'hash'>;

export interface UseAssetTransferResult {
  // The account's receive/sender address for this asset's network.
  address: string | null;
  isLoading: boolean;
  error: Error | null;
  // Whether the WDK is in a state that can service a transfer. Read-only,
  // best-effort callers (e.g. fee estimation) should gate on this rather than
  // calling `estimateFee`/`send` blindly, since it never surfaces an alert.
  isReady: boolean;
  // Estimate the network fee for sending `amountBaseUnits` to `to`.
  estimateFee: (to: string, amountBaseUnits: string) => Promise<FeeEstimate>;
  // Sign and broadcast a transfer of `amountBaseUnits` to `to`.
  send: (to: string, amountBaseUnits: string) => Promise<TransactionResult>;
}

// Transfer surface for a single registered asset. Resolves the asset's config
// from the registry, binds a WDK account on its network, and exposes send/fee
// estimation in base units. Both writes are gated on WDK readiness.
export function useAssetTransfer(assetId: string): UseAssetTransferResult {
  const config = getAssetConfig(assetId);

  if (!config) {
    throw new Error(`useAssetTransfer: unknown asset id "${assetId}"`);
  }

  const ensureWdkReady = useEnsureWdkReady();
  const isReady = useIsWdkReady();
  const account = useAccount<object>({
    accountIndex: 0,
    network: config.network,
  });

  const asset = useMemo(() => new BaseAsset(config), [config]);

  // Fee estimation is a read-only, best-effort path: it must never alert. So
  // it does not call the alerting `ensureWdkReady` guard — callers gate on
  // `isReady` and treat any throw here as a soft failure (blank fee).
  const estimateFee = useCallback(
    async (to: string, amountBaseUnits: string): Promise<FeeEstimate> => {
      return account.estimateFee({ to, asset, amount: amountBaseUnits });
    },
    [account, asset],
  );

  const send = useCallback(
    async (to: string, amountBaseUnits: string): Promise<TransactionResult> => {
      ensureWdkReady();
      return account.send({ to, asset, amount: amountBaseUnits });
    },
    [ensureWdkReady, account, asset],
  );

  return useMemo(
    () => ({
      address: account.address,
      isLoading: account.isLoading,
      error: account.error,
      isReady,
      estimateFee,
      send,
    }),
    [
      account.address,
      account.isLoading,
      account.error,
      isReady,
      estimateFee,
      send,
    ],
  );
}
