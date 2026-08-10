import { useEffect, useMemo } from 'react';
import {
  BaseAsset,
  useBalancesForWallet,
} from '@tetherto/wdk-react-native-core';
import { SUPPORTED_ASSETS } from '@shared/config';

export interface UseAssetBalancesResult {
  // assetId -> base-unit balance string. Missing entries mean not-yet-loaded
  // or a per-asset fetch failure.
  balances: Map<string, string>;
  // assetId -> why that asset's balance is missing. A balance can fail for one
  // network while the rest succeed, so this is per asset rather than a single
  // error for the whole call.
  errors: Map<string, string>;
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

  const { balances, errors } = useMemo(() => {
    const loaded = new Map<string, string>();
    const failed = new Map<string, string>();

    data?.forEach(result => {
      if (result.success && result.balance != null) {
        loaded.set(result.assetId, result.balance);
      } else {
        // A `success: true` row with a null balance is the store's "not
        // fetched yet" placeholder, not a failure worth naming.
        failed.set(
          result.assetId,
          result.error ?? (result.success ? 'Not fetched yet' : 'Fetch failed'),
        );
      }
    });

    return { balances: loaded, errors: failed };
  }, [data]);

  // Balances failing per network is invisible in the UI (the row just shows a
  // dash), so the reason goes to the console instead of being swallowed.
  useEffect(() => {
    if (errors.size > 0) {
      console.warn(
        '[useAssetBalances] balances unavailable:',
        Object.fromEntries(errors),
      );
    }
  }, [errors]);

  return { balances, errors, isLoading, error };
}
