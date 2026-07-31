import type { WdkConfigs } from '@tetherto/wdk-react-native-core';

export const wdkConfigs: WdkConfigs = {
  networks: {
    ethereum: {
      blockchain: 'ethereum',
      config: {
        chainId: 11155111,
        provider: 'https://rpc.sepolia.org',
        bundlerUrl: 'https://api.candide.dev/public/v3/11155111',
        paymasterUrl: 'https://api.candide.dev/public/v3/11155111',
        paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
        transferMaxFee: 5000000,
        paymasterToken: {
          address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        },
      },
    },
  },
};
