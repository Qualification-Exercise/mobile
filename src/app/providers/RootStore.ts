import {
  AppStateStore,
  AuthStore,
  BiometryStore,
  NavigationStore,
  SecretsStore,
  WalletBackupStore,
  WalletStore,
  WdkAppStore,
} from '@shared/store/domains';
import { GoogleDriveKeyProvider } from '@shared/api';

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
    cloudKeyProvider: new GoogleDriveKeyProvider(),
    getUserId: () => this.authStore.user?.id ?? null,
    isAuthenticated: () => this.authStore.isAuthenticated,
  });
  navigationStore = new NavigationStore(this);
}
