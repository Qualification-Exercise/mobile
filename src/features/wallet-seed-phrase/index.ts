export { DEFAULT_WALLET_ID, MNEMONIC_WORD_COUNT } from './constants';
export { WalletSessionLock } from './WalletSessionLock';
export { useWallet } from './useWallet';
export type { UseWalletResult } from './useWallet';

export function isWalletAlreadyExistsError(message: string): boolean {
  return message.includes('already exists');
}
