import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  CloudKeyProviderError,
  type CloudAuthorizationOutcome,
} from '@shared/lib/wallet-backup';

export const GOOGLE_DRIVE_APP_DATA_SCOPE =
  'https://www.googleapis.com/auth/drive.appdata';

type GoogleSignInSuccessResponse = {
  type: 'success';
  data: {
    scopes: string[];
  };
};

type GoogleSignInCancelledResponse = {
  type: 'cancelled';
  data: null;
};

type GoogleSignInResponse =
  | GoogleSignInSuccessResponse
  | GoogleSignInCancelledResponse;

type GoogleSignInSilentResponse =
  | GoogleSignInSuccessResponse
  | {
      type: 'noSavedCredentialFound';
      data: null;
    };

export interface GoogleSignInAuthorizationClient {
  hasPlayServices(options: {
    showPlayServicesUpdateDialog: boolean;
  }): Promise<boolean>;
  signInSilently(): Promise<GoogleSignInSilentResponse>;
  addScopes(options: {
    scopes: string[];
  }): Promise<GoogleSignInResponse | null>;
  getTokens(): Promise<{ accessToken: string }>;
  clearCachedAccessToken(accessToken: string): Promise<unknown>;
}

type AuthorizationRequest = {
  interactive: boolean;
  promise: Promise<CloudAuthorizationOutcome>;
};

export class GoogleDriveAuthorization {
  private authorizationRequest: AuthorizationRequest | null = null;
  private tokenRequest: Promise<string> | null = null;

  constructor(
    private readonly client: GoogleSignInAuthorizationClient = GoogleSignin,
  ) {}

  authorize(interactive: boolean): Promise<CloudAuthorizationOutcome> {
    const currentRequest = this.authorizationRequest;
    if (currentRequest) {
      if (currentRequest.interactive || !interactive) {
        return currentRequest.promise;
      }

      return currentRequest.promise.then(outcome => {
        if (outcome.status !== 'denied') {
          return outcome;
        }
        return this.authorize(true);
      });
    }

    const promise = this.performAuthorization(interactive).finally(() => {
      if (this.authorizationRequest?.promise === promise) {
        this.authorizationRequest = null;
      }
    });
    this.authorizationRequest = { interactive, promise };
    return promise;
  }

  async withAccessToken<Result>(
    operation: (accessToken: string) => Promise<Result>,
  ): Promise<Result> {
    const accessToken = await this.getAccessToken();
    return operation(accessToken);
  }

  async clearCachedAccessToken(accessToken: string): Promise<void> {
    if (!accessToken) {
      throw new CloudKeyProviderError('token_unavailable');
    }

    try {
      await this.client.clearCachedAccessToken(accessToken);
    } catch {
      throw new CloudKeyProviderError('token_unavailable');
    }
  }

  private async performAuthorization(
    interactive: boolean,
  ): Promise<CloudAuthorizationOutcome> {
    try {
      const servicesAvailable = await this.client.hasPlayServices({
        showPlayServicesUpdateDialog: interactive,
      });
      if (!servicesAvailable) {
        return { status: 'unavailable' };
      }

      const silentResponse = await this.client.signInSilently();
      if (silentResponse.type === 'noSavedCredentialFound') {
        return { status: 'signed_out' };
      }
      if (this.hasDriveScope(silentResponse)) {
        return { status: 'authorized' };
      }
      if (!interactive) {
        return { status: 'denied' };
      }

      const response = await this.client.addScopes({
        scopes: [GOOGLE_DRIVE_APP_DATA_SCOPE],
      });
      if (response == null) {
        return { status: 'signed_out' };
      }
      if (response.type === 'cancelled') {
        return { status: 'cancelled' };
      }
      return this.hasDriveScope(response)
        ? { status: 'authorized' }
        : { status: 'denied' };
    } catch (error) {
      return this.classifyKnownError(error);
    }
  }

  private classifyKnownError(error: unknown): CloudAuthorizationOutcome {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { status: 'unavailable' };
      }
      if (error.code === statusCodes.SIGN_IN_REQUIRED) {
        return { status: 'signed_out' };
      }
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { status: 'cancelled' };
      }
    }

    throw new CloudKeyProviderError('authorization_failed');
  }

  private hasDriveScope(response: GoogleSignInSuccessResponse): boolean {
    return response.data.scopes.includes(GOOGLE_DRIVE_APP_DATA_SCOPE);
  }

  private getAccessToken(): Promise<string> {
    if (this.tokenRequest) {
      return this.tokenRequest;
    }

    const promise = this.loadAccessToken().finally(() => {
      if (this.tokenRequest === promise) {
        this.tokenRequest = null;
      }
    });
    this.tokenRequest = promise;
    return promise;
  }

  private async loadAccessToken(): Promise<string> {
    try {
      const { accessToken } = await this.client.getTokens();
      if (!accessToken) {
        throw new CloudKeyProviderError('token_unavailable');
      }
      return accessToken;
    } catch (error) {
      if (error instanceof CloudKeyProviderError) {
        throw error;
      }
      throw new CloudKeyProviderError('token_unavailable');
    }
  }
}

export const googleDriveAuthorization = new GoogleDriveAuthorization();
