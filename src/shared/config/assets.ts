import type { AssetConfig } from '@tetherto/wdk-react-native-core';
import { BaseAsset } from '@tetherto/wdk-react-native-core';
import type { NetworkName } from '../../../.wdk';
import {
  ARBITRUM_CHAIN_ID,
  NATIVE_MAX_TRANSFER_FEE,
  ETHEREUM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  USDT_ARBITRUM_ADDRESS,
  USDT_ETHEREUM_SEPOLIA_ADDRESS,
  USDT_POLYGON_ADDRESS,
} from './wdk';

// USDt on Tron (TRC20). Unlike the EVM addresses this one is not part of the
// WDK paymaster config, so it lives here only.
const USDT_TRON_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// UTL (utility token), the cashback payout token. Deployed on Ethereum Sepolia
// alongside the CouponClaim contract (contract/deployments/11155111.json).
const UTL_ETHEREUM_ADDRESS = '0x63dE56C3909825e1d83e69daDa3f1e9E379f71AD';

// The network of every asset must match a key in wdkConfigs.networks.
export type SupportedAssetConfig = AssetConfig & { network: NetworkName };

// The token a network fee is denominated in, for display before signing.
export type FeeToken = { decimals: number; symbol: string };

// Single source of truth for token metadata. One entry per (asset, network),
// grouped by network and listing each network's gas coin first.
//
// The gas coins are here because the user needs to see them even though the
// paymaster settles token-transfer fees in USDt: a native send still pays its
// own fee, and an empty gas balance is what explains a stuck chain.
export const SUPPORTED_ASSETS: SupportedAssetConfig[] = [
  {
    id: 'btc-bitcoin',
    network: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    isNative: true,
  },
  {
    id: 'btc-spark',
    network: 'spark',
    symbol: 'BTC',
    name: 'Bitcoin (Spark)',
    decimals: 8,
    isNative: true,
  },
  {
    id: 'eth-ethereum',
    network: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true,
  },
  {
    id: 'usdt-ethereum',
    network: 'ethereum',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    address: USDT_ETHEREUM_SEPOLIA_ADDRESS,
  },
  {
    id: 'utl-ethereum',
    network: 'ethereum',
    symbol: 'UTL',
    name: 'Utility Token',
    decimals: 18,
    isNative: false,
    address: UTL_ETHEREUM_ADDRESS,
  },
  {
    id: 'eth-arbitrum',
    network: 'arbitrum',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true,
  },
  {
    id: 'usdt-arbitrum',
    network: 'arbitrum',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    address: USDT_ARBITRUM_ADDRESS,
  },
  // Polygon's gas coin is POL (formerly MATIC), not ETH.
  {
    id: 'pol-polygon',
    network: 'polygon',
    symbol: 'POL',
    name: 'Polygon Ecosystem Token',
    decimals: 18,
    isNative: true,
  },
  {
    id: 'usdt-polygon',
    network: 'polygon',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    address: USDT_POLYGON_ADDRESS,
  },
  {
    id: 'trx-tron',
    network: 'tron',
    symbol: 'TRX',
    name: 'TRON',
    decimals: 6,
    isNative: true,
  },
  {
    id: 'usdt-tron',
    network: 'tron',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    address: USDT_TRON_ADDRESS,
  },
];

// The backend's `srcChainId` per network — its single id space for chains.
// EVM networks use their real chain id (mirrored from the WDK network configs
// in wdk.ts so the two cannot drift); the chains that have no chain id of
// their own get the synthetic ids the backend assigns them in
// `src/chains/index.ts`, and the backend requires one for every linked wallet.
const SRC_CHAIN_IDS: Record<NetworkName, number> = {
  ethereum: ETHEREUM_CHAIN_ID,
  arbitrum: ARBITRUM_CHAIN_ID,
  polygon: POLYGON_CHAIN_ID,
  tron: 4294967297,
  bitcoin: 4294967298,
  spark: 4294967299,
};

export function getSrcChainId(network: NetworkName): number {
  return SRC_CHAIN_IDS[network];
}

// The backend's chain family (`EChainKind`) per network. It groups networks by
// address/signature format, so every EVM network reports as `evm` and the
// `srcChainId` is what tells them apart.
export type ChainKind = 'evm' | 'tron' | 'bitcoin' | 'spark';

const CHAIN_KINDS: Record<NetworkName, ChainKind> = {
  ethereum: 'evm',
  arbitrum: 'evm',
  polygon: 'evm',
  tron: 'tron',
  bitcoin: 'bitcoin',
  spark: 'spark',
};

export function getChainKind(network: NetworkName): ChainKind {
  return CHAIN_KINDS[network];
}

// User-facing network name. `ethereum` here is Sepolia — the cashback token
// only exists on the testnet, while payments settle on Arbitrum mainnet, so
// the two must not read as the same environment in a single list.
const NETWORK_LABELS: Record<NetworkName, string> = {
  bitcoin: 'Bitcoin',
  spark: 'Spark',
  ethereum: 'Ethereum Sepolia',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  tron: 'Tron',
};

export function getNetworkLabel(network: NetworkName): string {
  return NETWORK_LABELS[network];
}

// The ticker the price feed knows an asset by, when it differs from the one
// the wallet shows. Bitfinex (the feed behind `GET /pricing/live`) quotes
// USD₮ as `UST`; asking it for `USDT` returns no price at all, which silently
// drops the asset out of the fiat total.
const PRICE_TICKERS: Record<string, string> = {
  USDT: 'UST',
};

export function getPriceTicker(symbol: string): string {
  const ticker = symbol.toUpperCase();
  return PRICE_TICKERS[ticker] ?? ticker;
}

// The registry split into per-network groups, in registry order. Both the
// asset list and the receive picker read the same grouping, so a new asset
// shows up in the right place in both without touching either screen.
export function groupAssetsByNetwork<T extends { network: NetworkName }>(
  items: T[],
): { network: NetworkName; assets: T[] }[] {
  const groups: { network: NetworkName; assets: T[] }[] = [];
  for (const item of items) {
    const group = groups.find(candidate => candidate.network === item.network);
    if (group) {
      group.assets.push(item);
    } else {
      groups.push({ network: item.network, assets: [item] });
    }
  }
  return groups;
}

// Resolve a backend transaction/coupon row back to a registry asset. The
// backend identifies a token by chain family + chain id + symbol, which is
// exactly what the registry keys on once the network is mapped.
export function findAssetConfig(
  chain: ChainKind,
  srcChainId: number | undefined,
  symbol: string,
): SupportedAssetConfig | undefined {
  const wanted = symbol.toUpperCase();
  return SUPPORTED_ASSETS.find(config => {
    if (getChainKind(config.network) !== chain) {
      return false;
    }
    if (chain === 'evm' && getSrcChainId(config.network) !== srcChainId) {
      return false;
    }
    return config.symbol.toUpperCase() === wanted;
  });
}

// Every distinct network the wallet supports, derived from the registry.
export const SUPPORTED_NETWORKS: NetworkName[] = [
  ...new Set(SUPPORTED_ASSETS.map(config => config.network)),
];

// The most a transfer may cost when gas is paid in the chain's own coin, in
// that coin's base units. `undefined` leaves the transfer uncapped, which is
// what the non-EVM chains do anyway.
export function getNativeMaxTransferFee(
  network: NetworkName,
): bigint | undefined {
  return NATIVE_MAX_TRANSFER_FEE[network];
}

// The gas coin of `network` — the asset a fee is denominated in when the fee
// is not paid through the paymaster.
export function getNativeAsset(
  network: NetworkName,
): SupportedAssetConfig | undefined {
  return SUPPORTED_ASSETS.find(
    config => config.network === network && config.isNative,
  );
}

// Look up an asset's raw config by id.
export function getAssetConfig(id: string): SupportedAssetConfig | undefined {
  return SUPPORTED_ASSETS.find(config => config.id === id);
}

// Resolve an asset id to an IAsset instance ready for WDK calls.
export function getAsset(id: string): BaseAsset | undefined {
  const config = getAssetConfig(id);
  return config ? new BaseAsset(config) : undefined;
}

// How a network fee is denominated for an asset.
//
// On EVM the account is ERC-4337, so it has a choice: `native` gas spends the
// chain's own coin, `token` gas routes through the paymaster, which fronts the
// coin and bills USDt. Tron token transfers burn TRX for gas; native sends pay
// in the asset itself. Fee-token semantics per network are best-effort — this
// only affects the human-readable fee shown before signing.
export function getFeeToken(
  config: SupportedAssetConfig,
  gasMode: 'native' | 'token' = 'token',
): FeeToken {
  if (config.isNative) {
    return { decimals: config.decimals, symbol: config.symbol };
  }

  if (gasMode === 'native') {
    const native = getNativeAsset(config.network);
    if (native) {
      return { decimals: native.decimals, symbol: native.symbol };
    }
  }

  switch (config.network) {
    case 'ethereum':
    case 'arbitrum':
    case 'polygon':
      return { decimals: 6, symbol: 'USDT' };
    case 'tron':
      return { decimals: 6, symbol: 'TRX' };
    default:
      return { decimals: config.decimals, symbol: config.symbol };
  }
}
