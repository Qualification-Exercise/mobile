import type { AddressInfoResult } from '@tetherto/wdk-react-native-core';
import type { LinkWalletEntry } from '@shared/api';

const LINK_TARGETS: Array<{
  network: string;
  chain: LinkWalletEntry['chain'];
  srcChainId: number;
  path?: string;
}> = [
  {
    network: 'ethereum',
    chain: 'evm',
    srcChainId: 11155111,
    path: "m/44'/60'/0'/0/0",
  },
  {
    network: 'tron',
    chain: 'tron',
    srcChainId: 4294967297,
  },
  {
    network: 'spark',
    chain: 'spark',
    srcChainId: 4294967299,
  },
];

export const BACKUP_ADDRESS_NETWORKS = LINK_TARGETS.map(
  target => target.network,
);

export function buildLinkWalletEntries(
  addresses: AddressInfoResult[],
): LinkWalletEntry[] {
  const entries: LinkWalletEntry[] = [];

  for (const target of LINK_TARGETS) {
    const match = addresses.find(
      entry => entry.success && entry.network === target.network,
    );

    if (!match?.success || !match.address) {
      continue;
    }

    entries.push({
      chain: target.chain,
      srcChainId: target.srcChainId,
      address: match.address,
      path: target.path,
    });
  }

  const hasEvm = entries.some(entry => entry.chain === 'evm');
  if (!hasEvm) {
    throw new Error('EVM wallet address is required before backend backup');
  }

  return entries;
}
