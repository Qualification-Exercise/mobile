import { useEffect } from 'react';
import { useAddresses } from '@tetherto/wdk-react-native-core';
import type { NetworkName } from '../../../../../.wdk';

export interface UseReceiveAddressResult {
  // The derived receive address for `network`, or undefined until loaded.
  address: string | undefined;
  isLoading: boolean;
}

// Derives the account-0 receive address for a single network. Triggers a load
// for that network on mount and returns the first derived address.
export function useReceiveAddress(
  network: NetworkName,
): UseReceiveAddressResult {
  const { loadAddresses, getAddressesForNetwork, isLoading } = useAddresses();

  useEffect(() => {
    // Fire-and-forget: address results are read from the store below. Errors
    // surface via the empty address (nothing to render/copy).
    loadAddresses([0], [network]).catch(() => {});
  }, [network, loadAddresses]);

  const address = getAddressesForNetwork(network)[0]?.address;

  return { address, isLoading };
}
