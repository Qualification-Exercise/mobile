import { useMemo } from 'react';
import { BaseAsset, useBalancesForWallet } from '@tetherto/wdk-react-native-core';
import { SUPPORTED_ASSETS } from '@shared/config';

export interface UseAssetBalancesResult {
  // assetId -> base-unit balance string. Missing entries mean not-yet-loaded
  // or a per-asset fetch failure.
  balances: Map<string, string>;
  isLoading: boolean;
  error: Error | null;
}

// Source of truth for balances across every registered asset. Wraps
// `useBalancesForWallet` for account 0 and reduces the results into a map
// keyed by asset id, with base-unit string balances.
export function useAssetBalances(): UseAssetBalancesResult {
  const assets = useMemo(
    () => SUPPORTED_ASSETS.map(config => new BaseAsset(config)),
    [],
  );

  const { data, isLoading, error } = useBalancesForWallet(0, assets);

  const balances = useMemo(() => {
    const map = new Map<string, string>();
    data?.forEach(result => {
      if (result.success && result.balance != null) {
        map.set(result.assetId, result.balance);
      }
    });
    return map;
  }, [data]);

  return { balances, isLoading, error };
}
