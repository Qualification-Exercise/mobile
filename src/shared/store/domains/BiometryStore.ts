import { makeAutoObservable, runInAction } from 'mobx';
import {
  authenticateWithBiometrics,
  isBiometricAvailable,
} from '../../lib/biometrics';

// Result of an `enable()` attempt, so the UI can route each case distinctly:
// - `enabled`           — session unlocked, proceed.
// - `permission-denied` — hardware is present & enrolled but the OS reports the
//                         sensor unavailable, i.e. the app's biometric
//                         permission was declined; send the user to Settings.
// - `unavailable`       — no biometric hardware or nothing enrolled on device.
// - `failed`            — transient: user cancelled, wrong face, or lockout.
export type EnableOutcome =
  | 'enabled'
  | 'permission-denied'
  | 'unavailable'
  | 'failed';

// Owns the app's per-session biometric-unlock state and all interaction with
// the device biometric sensor. Kept separate from wallet/account state so the
// authentication concern stays self-contained and reusable.
export class BiometryStore {
  // In-memory session unlock flag — intentionally NOT persisted, so it resets
  // to `false` on every cold start and the user must re-unlock each launch.
  enabled = false;
  // Device capability: biometric hardware is present, enrolled, and permitted.
  // Re-evaluated on hydrate and every enable attempt so a revoked OS permission
  // is reflected the next time we route.
  isAvailable = false;
  // Flips to `true` once the startup capability probe completes. Navigation
  // waits on this before resolving the initial route.
  isHydrated = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Whether biometric protection is both unlocked in this session AND usable on
  // this device right now. This is the gate an authenticated user must pass to
  // enter the app — if it is `false` they are held on the enable screen.
  get isActive(): boolean {
    return this.enabled && this.isAvailable;
  }

  // Probe device capability on startup. Always resolves with `isHydrated` set
  // so the UI can stop waiting on it.
  async hydrate() {
    try {
      const available = await isBiometricAvailable();

      runInAction(() => {
        this.isAvailable = available;
      });
    } finally {
      runInAction(() => {
        this.isHydrated = true;
      });
    }
  }

  // Prompt for a biometric scan and unlock the session only on a successful
  // match. Returns a discriminated `EnableOutcome` so callers can route the
  // permission-denied case to Settings while keeping the toggle off otherwise.
  async enable(): Promise<EnableOutcome> {
    const available = await isBiometricAvailable();
    runInAction(() => {
      this.isAvailable = available;
    });

    if (!available) {
      return 'unavailable';
    }

    const result = await authenticateWithBiometrics('Enable biometric unlock');

    runInAction(() => {
      this.enabled = result.success;
    });

    if (result.success) {
      return 'enabled';
    }

    // Hardware is present and enrolled (checked above), yet the OS still reports
    // the sensor unavailable — this is how a revoked app-level biometric
    // permission surfaces, so the fix lives in Settings rather than a retry.
    if (result.error === 'not_available') {
      return 'permission-denied';
    }

    return 'failed';
  }

  // Require a fresh biometric scan before a sensitive action (e.g. signing a
  // transaction). When biometrics are disabled this is a no-op that resolves
  // `true` so the flow proceeds unguarded.
  async confirm(promptMessage: string): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    const result = await authenticateWithBiometrics(promptMessage);

    return result.success;
  }
}
