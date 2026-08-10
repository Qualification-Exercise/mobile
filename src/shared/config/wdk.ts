import type { WdkConfigs } from '@tetherto/wdk-react-native-core';
import { TRON_API_KEY, TRON_API_SECRET } from '@env';

const erc4337Defaults = {
  paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
  entrypointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  // Denominated in the paymaster token (USDt, 6 decimals): 5 USDt. Only
  // applies when gas is paid through the paymaster — see
  // `NATIVE_MAX_TRANSFER_FEE` for the native-gas ceiling.
  transferMaxFee: 5000000,
  // Required by every ERC-4337 network, not optional: the account constructor
  // looks the Safe module addresses up by this version and throws on an
  // unknown one. `0.3.0` is currently the only version the WDK supports.
  safeModulesVersion: '0.3.0',
};

// Per-network ceiling on a transfer's fee when gas is paid in the chain's own
// coin, in that coin's base units (wei for ETH/POL).
//
// It cannot be shared with `transferMaxFee` below: that one is denominated in
// the paymaster token (USDt, 6 decimals), so reusing it in native mode would
// cap every transfer at a few thousand wei and reject all of them. Values are
// deliberately loose — this is a runaway-gas guard, not a fee target.
export const NATIVE_MAX_TRANSFER_FEE: Record<string, bigint> = {
  // 0.01 ETH — Sepolia gas is erratic and the coin is worthless anyway.
  ethereum: 10_000_000_000_000_000n,
  // 0.005 ETH — an Arbitrum user operation costs a small fraction of this.
  arbitrum: 5_000_000_000_000_000n,
  // 5 POL.
  polygon: 5_000_000_000_000_000_000n,
};

// EVM JSON-RPC endpoints. A single unreachable endpoint fails the whole
// balance batch (WDK's `fetchBalances` rejects rather than degrading per
// network), so these must all be endpoints that answer without an API key.
// `polygon-rpc.com` no longer does: it answers 401 `API key disabled`.
// Bitcoin's stateless HTTPS backend (Blockbook v2 REST), used ahead of the
// Electrum sockets below.
const BLOCKBOOK_URL = 'https://btc1.trezor.io/api';

const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const ARBITRUM_RPC_URL = 'https://arbitrum-one-rpc.publicnode.com';
const POLYGON_RPC_URL = 'https://polygon-bor-rpc.publicnode.com';

// USDt contract addresses per EVM network. Shared between the WDK paymaster
// config below and the asset registry (src/shared/config/assets.ts) so the two
// can never drift.
export const USDT_ARBITRUM_ADDRESS =
  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
// USD₮ on Ethereum Sepolia. This is the one Candide's paymaster accepts on
// this chain (`pm_supportedERC20Tokens`), which is what makes token-paid gas
// work here at all.
export const USDT_ETHEREUM_SEPOLIA_ADDRESS =
  '0xd077A400968890Eacc75cdc901F0356c943e4fDb';
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

export const wdkConfigs: WdkConfigs = {
  networks: {
    bitcoin: {
      blockchain: 'bitcoin',
      config: {
        network: 'bitcoin',
        // A list, not one server: the wallet wraps it in its failover provider
        // and moves to the next entry when a call fails.
        //
        // Blockbook comes first because it is plain HTTPS with no session. The
        // Electrum entries hold one long-lived TCP socket, and a phone loses
        // that socket constantly — backgrounding, wifi/LTE handover, an idle
        // server hanging up. The client does not notice until the next call,
        // which then fails with "Connection to server lost, please retry".
        client: [
          { type: 'blockbook-http', clientConfig: { url: BLOCKBOOK_URL } },
          {
            type: 'electrum',
            clientConfig: {
              host: 'electrum.blockstream.info',
              // 50002 is the TLS port; 50001 is plaintext, which mobile
              // carriers and captive networks are happy to interrupt.
              port: 50002,
              protocol: 'ssl',
              // Default is 120s. Ping more often than a NAT or the server
              // times an idle connection out, so the socket is kept rather
              // than found dead mid-request.
              pingPeriod: 30_000,
            },
          },
        ],
        // Failover attempts across the list above.
        retries: 2,
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
        provider: SEPOLIA_RPC_URL,
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
        provider: ARBITRUM_RPC_URL,
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
        provider: POLYGON_RPC_URL,
        bundlerUrl: 'https://api.candide.dev/public/v3/polygon',
        paymasterUrl: 'https://api.candide.dev/public/v3/polygon',
        ...erc4337Defaults,
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
