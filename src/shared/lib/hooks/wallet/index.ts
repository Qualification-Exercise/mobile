export { DEFAULT_WALLET_ID, MNEMONIC_WORD_COUNT } from './constants';
export { useWalletSessionLock } from './useWalletSessionLock';
export { useWallet } from './useWallet';
export type { UseWalletResult } from './useWallet';
export {
  useEnsureWdkReady,
  WdkNotReadyError,
  type WdkStatus,
  type WalletManagerStatus,
} from './useEnsureWdkReady';
export { useAssetTransfer } from './useAssetTransfer';
export type {
  UseAssetTransferResult,
  FeeEstimate,
} from './useAssetTransfer';
export { useAssetBalances } from './useAssetBalances';
export type { UseAssetBalancesResult } from './useAssetBalances';
export { useReceiveAddress } from './useReceiveAddress';
export type { UseReceiveAddressResult } from './useReceiveAddress';

export function isWalletAlreadyExistsError(message: string): boolean {
  return message.includes('already exists');
}
