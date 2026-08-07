import {
  AppStateStore,
  AuthStore,
  BiometryStore,
  NavigationStore,
  SecretsStore,
  WalletStore,
  WdkAppStore,
} from '@shared/store/domains';

export class RootStore {
  walletStore = new WalletStore();
  authStore = new AuthStore();
  biometryStore = new BiometryStore();
  wdkAppStore = new WdkAppStore();
  appStateStore = new AppStateStore();
  secretsStore = new SecretsStore();
  navigationStore = new NavigationStore(this);
}
