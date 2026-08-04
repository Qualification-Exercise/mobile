import {
  AppStateStore,
  AuthStore,
  BiometryStore,
  NavigationStore,
  WalletStore,
  WdkAppStore,
} from '@shared/store/domains';
import { WalletSeedPhraseStore } from '@features/wallet-seed-phrase';

export class RootStore {
  walletStore = new WalletStore();
  authStore = new AuthStore();
  biometryStore = new BiometryStore();
  walletSeedPhraseStore = new WalletSeedPhraseStore();
  wdkAppStore = new WdkAppStore();
  appStateStore = new AppStateStore();
  navigationStore = new NavigationStore(this);
}
