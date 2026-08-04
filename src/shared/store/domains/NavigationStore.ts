import type { RootStackParamList } from '@app/navigation/types';
import type { RootStore } from '@app/providers/RootStore';

export class NavigationStore {
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
}
