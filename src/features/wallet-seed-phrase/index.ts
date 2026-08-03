export { DEFAULT_WALLET_ID, MNEMONIC_WORD_COUNT } from './constants';
export { WalletSeedPhraseStore } from './WalletSeedPhraseStore';
export { WalletSessionLock } from './WalletSessionLock';
export { WdkSeedPhraseBridge } from './WdkSeedPhraseBridge';

export function isWalletAlreadyExistsError(message: string): boolean {
  return message.includes('already exists');
}
