import { WalletStore } from '@shared/store/domains';

export class RootStore {
  walletStore = new WalletStore();
}
