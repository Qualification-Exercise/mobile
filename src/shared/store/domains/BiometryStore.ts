import { makeAutoObservable, runInAction } from 'mobx';
import {
  authenticateWithBiometrics,
  isBiometricAvailable,
} from '../../lib/biometrics';
import {
  loadBiometryEnabled,
  saveBiometryEnabled,
} from '../../lib/biometryStorage';

export type BiometryOutcome =
  | 'unlocked'
  | 'permission-denied'
  | 'unavailable'
  | 'failed';

export class BiometryStore {
  isEnrolled = false;
  isAvailable = false;
  isHydrated = false;

  constructor() {
    makeAutoObservable(this);
  }

  async hydrate() {
    const [enrolled, available] = await Promise.all([
      loadBiometryEnabled(),
      isBiometricAvailable(),
    ]);

    runInAction(() => {
      this.isEnrolled = enrolled;
      this.isAvailable = available;
      this.isHydrated = true;
    });
  }

  async enableBiometric(prompt: string): Promise<BiometryOutcome> {
    const isAvailable = await isBiometricAvailable();

    this.isAvailable = isAvailable;

    if (!isAvailable) {
      return 'unavailable';
    }

    const result = await authenticateWithBiometrics(prompt);

    await saveBiometryEnabled(result.success);
    this.isEnrolled = result.success;

    if (result.success) {
      return 'unlocked';
    }

    if (!result.success && result.error === 'not_available') {
      // use declined permission prompt
      return 'permission-denied';
    }

    return 'failed';
  }
}
