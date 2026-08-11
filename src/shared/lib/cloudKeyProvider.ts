export type CloudAuthorizationOutcome =
  | { status: 'authorized' }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'signed_out' }
  | { status: 'unavailable' };

export type CloudKeyLookupResult =
  | { status: 'found'; encryptionKey: string }
  | { status: 'not_found' };

export type CloudKeyProviderErrorCode =
  | 'authorization_failed'
  | 'token_unavailable'
  | 'network_error'
  | 'unauthorized'
  | 'permission_denied'
  | 'invalid_response'
  | 'response_too_large'
  | 'remote_invariant';

const SAFE_ERROR_MESSAGES: Record<CloudKeyProviderErrorCode, string> = {
  authorization_failed: 'Cloud authorization failed.',
  token_unavailable: 'A cloud access token is unavailable.',
  network_error: 'Cloud storage could not be reached.',
  unauthorized: 'Cloud storage authorization expired.',
  permission_denied: 'Cloud storage access was denied.',
  invalid_response: 'Cloud storage returned an invalid wallet backup.',
  response_too_large: 'The cloud wallet backup is too large.',
  remote_invariant: 'Cloud storage contains conflicting wallet backup data.',
};

export class CloudKeyProviderError extends Error {
  constructor(readonly code: CloudKeyProviderErrorCode) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = 'CloudKeyProviderError';
  }

  toJSON(): {
    name: string;
    code: CloudKeyProviderErrorCode;
    message: string;
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}

export interface CloudKeyProvider {
  authorize(interactive: boolean): Promise<CloudAuthorizationOutcome>;
  getEncryptionKey(): Promise<CloudKeyLookupResult>;
  putEncryptionKey(encryptionKey: string): Promise<void>;
}
