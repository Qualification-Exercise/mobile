import type { AddressInfoResult } from '@tetherto/wdk-react-native-core';

export function resolvePrimaryEvmAddress(
  addresses: AddressInfoResult[],
): string {
  const ethereum = addresses.find(
    entry => entry.success && entry.network === 'ethereum',
  );

  if (!ethereum?.success || !ethereum.address) {
    throw new Error('Primary EVM address is unavailable');
  }

  return ethereum.address;
}
