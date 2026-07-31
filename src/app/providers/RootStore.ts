import { AuthStore, BiometryStore, WalletStore } from '@shared/store/domains';

export class RootStore {
  walletStore = new WalletStore();
  authStore = new AuthStore();
  biometryStore = new BiometryStore();
}
