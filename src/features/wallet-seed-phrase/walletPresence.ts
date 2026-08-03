import type { UseWalletManagerResult } from '@tetherto/wdk-react-native-core';
import { DEFAULT_WALLET_ID } from './constants';

type WalletList = UseWalletManagerResult['wallets'];

export function hasPersistedWallet(wallets: WalletList): boolean {
  return wallets.some(
    wallet => wallet.identifier === DEFAULT_WALLET_ID && wallet.exists,
  );
}
