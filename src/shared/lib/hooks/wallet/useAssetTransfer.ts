import { useCallback, useMemo } from 'react';
import {
  BaseAsset,
  useAccount,
  type TransactionResult,
} from '@tetherto/wdk-react-native-core';
import { getAssetConfig } from '@shared/config';
import { useEnsureWdkReady } from './useEnsureWdkReady';

// Fee estimate for a transfer (a send result without the broadcast hash).
export type FeeEstimate = Omit<TransactionResult, 'hash'>;

export interface UseAssetTransferResult {
  // The account's receive/sender address for this asset's network.
  address: string | null;
  isLoading: boolean;
  error: Error | null;
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
  const account = useAccount<object>({
    accountIndex: 0,
    network: config.network,
  });

  const asset = useMemo(() => new BaseAsset(config), [config]);

  const estimateFee = useCallback(
    async (to: string, amountBaseUnits: string): Promise<FeeEstimate> => {
      ensureWdkReady();
      return account.estimateFee({ to, asset, amount: amountBaseUnits });
    },
    [ensureWdkReady, account, asset],
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
      estimateFee,
      send,
    }),
    [account.address, account.isLoading, account.error, estimateFee, send],
  );
}
