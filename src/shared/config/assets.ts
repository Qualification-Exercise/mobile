import type { AssetConfig } from '@tetherto/wdk-react-native-core';
import { BaseAsset } from '@tetherto/wdk-react-native-core';
import type { NetworkName } from '../../../.wdk';
import {
  USDT_ARBITRUM_ADDRESS,
  USDT_ETHEREUM_SEPOLIA_ADDRESS,
  USDT_POLYGON_ADDRESS,
} from './wdk';

// USDt on Tron (TRC20). Unlike the EVM addresses this one is not part of the
// WDK paymaster config, so it lives here only.
const USDT_TRON_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// TODO: real UTL (utility token) contract address. Placeholder until the token
// is deployed; this is the single spot to edit when the real value is known.
const UTL_ETHEREUM_ADDRESS = '0x0000000000000000000000000000000000000000';

// The network of every asset must match a key in wdkConfigs.networks.
type SupportedAssetConfig = AssetConfig & { network: NetworkName };

// Single source of truth for token metadata. One entry per (asset, network).
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
    id: 'usdt-arbitrum',
    network: 'arbitrum',
    symbol: 'USDt',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    address: USDT_ARBITRUM_ADDRESS,
  },
  {
    id: 'usdt-ethereum',
    network: 'ethereum',
    symbol: 'USDt',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    address: USDT_ETHEREUM_SEPOLIA_ADDRESS,
  },
  {
    id: 'usdt-polygon',
    network: 'polygon',
    symbol: 'USDt',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    address: USDT_POLYGON_ADDRESS,
  },
  {
    id: 'usdt-tron',
    network: 'tron',
    symbol: 'USDt',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    address: USDT_TRON_ADDRESS,
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
];

// Look up an asset's raw config by id.
export function getAssetConfig(id: string): SupportedAssetConfig | undefined {
  return SUPPORTED_ASSETS.find(config => config.id === id);
}

// Resolve an asset id to an IAsset instance ready for WDK calls.
export function getAsset(id: string): BaseAsset | undefined {
  const config = getAssetConfig(id);
  return config ? new BaseAsset(config) : undefined;
}
