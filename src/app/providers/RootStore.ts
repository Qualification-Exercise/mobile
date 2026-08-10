import {
  AppStateStore,
  AuthStore,
  BiometryStore,
  NavigationStore,
  SecretsStore,
  WalletStore,
  WalletBackupStore,
  WdkAppStore,
} from '@shared/store/domains';

export class RootStore {
  walletStore = new WalletStore();
  authStore = new AuthStore();
  biometryStore = new BiometryStore();
  wdkAppStore = new WdkAppStore();
  appStateStore = new AppStateStore();
  secretsStore = new SecretsStore();
  walletBackupStore = new WalletBackupStore({
    biometryStore: this.biometryStore,
    secretsStore: this.secretsStore,
    isAuthenticated: () => this.authStore.isAuthenticated,
  });
  navigationStore = new NavigationStore(this);
}
