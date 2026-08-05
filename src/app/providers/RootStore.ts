import {
  AppStateStore,
  AuthStore,
  BiometryStore,
  NavigationStore,
  WalletStore,
  WdkAppStore,
} from '@shared/store/domains';

export class RootStore {
  walletStore = new WalletStore();
  authStore = new AuthStore();
  biometryStore = new BiometryStore();
  wdkAppStore = new WdkAppStore();
  appStateStore = new AppStateStore();
  navigationStore = new NavigationStore(this);
}
