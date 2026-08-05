import { makeAutoObservable } from 'mobx';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import type { RootStackParamList } from '@app/navigation/types';
import type { RootStore } from '@app/providers/RootStore';

type RootNavigationRef = NavigationContainerRefWithCurrent<RootStackParamList>;

export class NavigationStore {
  private navigationRef: RootNavigationRef | null = null;

  activeRouteName: keyof RootStackParamList | null = null;

  constructor(private readonly root: RootStore) {
    makeAutoObservable<NavigationStore, 'navigationRef'>(this, {
      navigationRef: false,
      setNavigationRef: false,
    });
  }

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

  setActiveRouteName(name: keyof RootStackParamList | undefined): void {
    this.activeRouteName = name ?? null;
  }

  goToBiometricUnlock(): void {
    if (!this.navigationRef?.isReady()) {
      return;
    }

    // Skip the reset when we are already on the unlock screen — otherwise every
    // return to the foreground re-resets the stack onto the same route.
    if (this.activeRouteName === 'BiometricUnlock') {
      return;
    }

    this.navigationRef.reset({
      index: 0,
      routes: [{ name: 'BiometricUnlock' }],
    });
  }
}
