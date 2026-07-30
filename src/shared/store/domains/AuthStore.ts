import { makeAutoObservable, runInAction } from 'mobx';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

export type GoogleAccount = {
  email: string;
  idToken: string | null;
};

export type AuthStatus = 'idle' | 'pending' | 'success' | 'error';

export class AuthStore {
  account: GoogleAccount | null = null;
  status: AuthStatus = 'idle';

  constructor() {
    makeAutoObservable(this);
  }

  get isPending() {
    return this.status === 'pending';
  }

  setGoogleAccount(account: GoogleAccount) {
    this.account = account;
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

      runInAction(() => {
        if (isSuccessResponse(response)) {
          this.setGoogleAccount({
            email: response.data.user.email,
            idToken: response.data.idToken,
          });
          this.status = 'success';
        } else {
          // The user dismissed or cancelled the sign-in flow.
          this.status = 'idle';
        }
      });
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
