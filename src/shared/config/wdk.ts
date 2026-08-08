import type { WdkConfigs } from '@tetherto/wdk-react-native-core';
import { TRON_API_KEY, TRON_API_SECRET } from '@env';

const erc4337Defaults = {
  paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
  entrypointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  transferMaxFee: 5000000,
};

// USDt contract addresses per EVM network. Shared between the WDK paymaster
// config below and the asset registry (src/shared/config/assets.ts) so the two
// can never drift.
export const USDT_ARBITRUM_ADDRESS =
  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
export const USDT_ETHEREUM_SEPOLIA_ADDRESS =
  '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0';
export const USDT_POLYGON_ADDRESS =
  '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

// EVM chain ids per network. Shared between the WDK network configs below and
// the backend `srcChainId` mapping (src/shared/config/assets.ts) so the two
// can never drift. Ethereum is Sepolia (testnet) per the locked plan decision.
export const ETHEREUM_CHAIN_ID = 11155111;
export const ARBITRUM_CHAIN_ID = 42161;
export const POLYGON_CHAIN_ID = 137;

const tronConfig: Record<string, unknown> = {
  provider: 'https://api.trongrid.io',
};

if (TRON_API_KEY) {
  tronConfig.apiKey = TRON_API_KEY;
}

if (TRON_API_SECRET) {
  tronConfig.apiSecret = TRON_API_SECRET;
}

// NOTE: environments are intentionally mixed. Ethereum runs on Sepolia
// (testnet) per the locked plan decision, while Bitcoin, Tron, Arbitrum and
// Polygon are configured against mainnet. Real funds can move on the mainnet
// chains — keep this in mind when testing, and revisit before any release that
// should be testnet-only.
export const wdkConfigs: WdkConfigs = {
  networks: {
    bitcoin: {
      blockchain: 'bitcoin',
      config: {
        // Use the SSL Electrum port (50002) with TLS rather than the plaintext
        // port (50001), so address/balance queries are not exposed on the wire.
        host: 'electrum.blockstream.info',
        port: 50002,
        protocol: 'ssl',
        network: 'bitcoin',
      },
    },
    spark: {
      blockchain: 'spark',
      config: {
        network: 'MAINNET',
      },
    },
    ethereum: {
      blockchain: 'ethereum',
      config: {
        chainId: ETHEREUM_CHAIN_ID,
        provider: 'https://rpc.sepolia.org',
        bundlerUrl: 'https://api.candide.dev/public/v3/11155111',
        paymasterUrl: 'https://api.candide.dev/public/v3/11155111',
        ...erc4337Defaults,
        paymasterToken: {
          address: USDT_ETHEREUM_SEPOLIA_ADDRESS,
        },
      },
    },
    arbitrum: {
      blockchain: 'arbitrum',
      config: {
        chainId: ARBITRUM_CHAIN_ID,
        provider: 'https://arb1.arbitrum.io/rpc',
        bundlerUrl: 'https://api.candide.dev/public/v3/arbitrum',
        paymasterUrl: 'https://api.candide.dev/public/v3/arbitrum',
        ...erc4337Defaults,
        paymasterToken: {
          address: USDT_ARBITRUM_ADDRESS,
        },
      },
    },
    polygon: {
      blockchain: 'polygon',
      config: {
        chainId: POLYGON_CHAIN_ID,
        provider: 'https://polygon-rpc.com',
        bundlerUrl: 'https://api.candide.dev/public/v3/polygon',
        paymasterUrl: 'https://api.candide.dev/public/v3/polygon',
        ...erc4337Defaults,
        safeModulesVersion: '0.3.0',
        paymasterToken: {
          address: USDT_POLYGON_ADDRESS,
        },
      },
    },
    tron: {
      blockchain: 'tron',
      config: tronConfig,
    },
  },
};
