import { useMemo } from 'react';
import {
  BaseAsset,
  useBalancesForWallet,
} from '@tetherto/wdk-react-native-core';
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

  // `staleTime: 0` so the cached (and initially empty) balances are treated as
  // stale and a live fetch runs on mount. Without it, `useBalancesForWallet`
  // serves its fresh `initialData` — null for any not-yet-cached asset — and
  // never refetches, so balances show "—" until a manual refresh.
  const { data, isLoading, error } = useBalancesForWallet(0, assets, {
    staleTime: 0,
  });

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
