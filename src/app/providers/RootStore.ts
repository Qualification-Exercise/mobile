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
  googleDriveKeyProvider = new GoogleDriveKeyProvider();
  walletBackupStore = new WalletBackupStore(this);
  navigationStore = new NavigationStore(this);
}
