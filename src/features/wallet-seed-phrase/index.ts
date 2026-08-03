export { DEFAULT_WALLET_ID, MNEMONIC_WORD_COUNT } from './constants';
export { WalletSeedPhraseStore } from './WalletSeedPhraseStore';
export { WdkSeedPhraseBridge } from './WdkSeedPhraseBridge';
export { WalletBootSync } from './WalletBootSync';

export function isWalletAlreadyExistsError(message: string): boolean {
  return message.includes('already exists');
}
