import type { WdkConfigs } from '@tetherto/wdk-react-native-core';
import { TRON_API_KEY, TRON_API_SECRET } from '@env';

const erc4337Defaults = {
  paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
  entrypointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  transferMaxFee: 5000000,
  safeModulesVersion: '0.3.0',
};

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
    spark: {
      blockchain: 'spark',
      config: {
        network: 'MAINNET',
      },
    },
    ethereum: {
      blockchain: 'ethereum',
      config: {
        chainId: 11155111,
        provider: 'https://rpc.sepolia.org',
        bundlerUrl: 'https://api.candide.dev/public/v3/11155111',
        paymasterUrl: 'https://api.candide.dev/public/v3/11155111',
        ...erc4337Defaults,
        paymasterToken: {
          address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        },
      },
    },
    arbitrum: {
      blockchain: 'arbitrum',
      config: {
        chainId: 42161,
        provider: 'https://arb1.arbitrum.io/rpc',
        bundlerUrl: 'https://api.candide.dev/public/v3/arbitrum',
        paymasterUrl: 'https://api.candide.dev/public/v3/arbitrum',
        ...erc4337Defaults,
        paymasterToken: {
          address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        },
      },
    },
    polygon: {
      blockchain: 'polygon',
      config: {
        chainId: 137,
        provider: 'https://polygon-rpc.com',
        bundlerUrl: 'https://api.candide.dev/public/v3/polygon',
        paymasterUrl: 'https://api.candide.dev/public/v3/polygon',
        ...erc4337Defaults,
        paymasterToken: {
          address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        },
      },
    },
    tron: {
      blockchain: 'tron',
      config: tronConfig,
    },
  },
};
