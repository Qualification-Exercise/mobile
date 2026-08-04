import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import type { RootStackParamList } from '@app/navigation/types';
import type { RootStore } from '@app/providers/RootStore';

type RootNavigationRef = NavigationContainerRefWithCurrent<RootStackParamList>;

export class NavigationStore {
  private navigationRef: RootNavigationRef | null = null;

  constructor(private readonly root: RootStore) {}

  get bootRoute(): keyof RootStackParamList {
    if (!this.root.authStore.isAuthenticated) {
      return 'SignIn';
    }

    if (!this.root.biometryStore.isEnrolled) {
      return 'EnableBiometric';
    }

    return 'BiometricUnlock';
  }

  setNavigationRef(ref: RootNavigationRef): void {
    this.navigationRef = ref;
  }

  goToBiometricUnlock(): void {
    if (!this.navigationRef?.isReady()) {
      return;
    }

    this.navigationRef.reset({
      index: 0,
      routes: [{ name: 'BiometricUnlock' }],
    });
  }
}
