export { DEFAULT_WALLET_ID, MNEMONIC_WORD_COUNT } from './constants';
export { WalletSessionLock } from './WalletSessionLock';

export function isWalletAlreadyExistsError(message: string): boolean {
  return message.includes('already exists');
}
