import { AuthStore, BiometryStore, WalletStore } from '@shared/store/domains';
import { WalletSeedPhraseStore } from '@features/wallet-seed-phrase';

export class RootStore {
  walletStore = new WalletStore();
  authStore = new AuthStore();
  biometryStore = new BiometryStore();
  walletSeedPhraseStore = new WalletSeedPhraseStore();
}
