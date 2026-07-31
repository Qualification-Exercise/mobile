import { makeAutoObservable, runInAction } from 'mobx';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  clearGoogleAccount,
  loadGoogleAccount,
  saveGoogleAccount,
} from '../../lib/authStorage';

export type GoogleAccount = {
  email: string;
  logged: boolean;
};

export type AuthStatus = 'idle' | 'pending' | 'success' | 'error';

export class AuthStore {
  account: GoogleAccount | null = null;
  status: AuthStatus = 'idle';
  // Flips to `true` once the startup keychain read has completed (whether or
  // not a session was found). Navigation waits on this before mounting.
  isHydrated = false;

  constructor() {
    makeAutoObservable(this);
  }

  get isPending() {
    return this.status === 'pending';
  }

  get isAuthenticated() {
    return this.account?.logged === true;
  }

  setGoogleAccount(account: GoogleAccount) {
    this.account = account;
  }

  // Restore a previously persisted Google account from the keychain. Call this
  // once on app startup to keep the user signed in across launches. Always
  // resolves with `isHydrated` set so the UI can stop waiting on it.
  async hydrate() {
    try {
      const account = await loadGoogleAccount();
      if (account) {
        runInAction(() => {
          this.account = account;
          this.status = 'success';
        });
      }
    } finally {
      runInAction(() => {
        this.isHydrated = true;
      });
    }
  }

  // Clear the in-memory account and remove it from the keychain.
  async signOut() {
    await clearGoogleAccount();
    runInAction(() => {
      this.account = null;
      this.status = 'idle';
    });
  }

  async signInWithGoogle() {
    // Ignore re-taps while a sign-in is already running.
    if (this.status === 'pending') {
      return;
    }

    this.status = 'pending';

    try {
      // Ensure Play Services are available (Android)
      await GoogleSignin.hasPlayServices();
      // Prompt user sign in
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const account: GoogleAccount = {
          email: response.data.user.email,
          logged: Boolean(response.data.idToken),
        };

        // Securely persist the account before flipping to `success` so a
        // relaunch can rehydrate it via `hydrate()`.
        await saveGoogleAccount(account);

        runInAction(() => {
          this.setGoogleAccount(account);
          this.status = 'success';
        });
      } else {
        // The user dismissed or cancelled the sign-in flow.
        runInAction(() => {
          this.status = 'idle';
        });
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        console.error('Google Sign-In Error:', error.code, error.message);
      }

      // A concurrent sign-in already owns the flow; leave its state untouched.
      const alreadyInProgress =
        isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS;

      runInAction(() => {
        this.status = alreadyInProgress ? this.status : 'error';
      });
    }
  }
}
