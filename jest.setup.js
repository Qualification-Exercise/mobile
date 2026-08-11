const { jest: jestRuntime } = require('@jest/globals');

jestRuntime.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jestRuntime.fn(),
    hasPlayServices: jestRuntime.fn(),
    signIn: jestRuntime.fn(),
    signInSilently: jestRuntime.fn(),
    addScopes: jestRuntime.fn(),
    signOut: jestRuntime.fn(),
    revokeAccess: jestRuntime.fn(),
    hasPreviousSignIn: jestRuntime.fn(),
    getCurrentUser: jestRuntime.fn(),
    getTokens: jestRuntime.fn(),
    clearCachedAccessToken: jestRuntime.fn(),
  },
  isErrorWithCode: jestRuntime.fn(() => false),
  isSuccessResponse: jestRuntime.fn(() => true),
  isCancelledResponse: jestRuntime.fn(
    response => response?.type === 'cancelled',
  ),
  isNoSavedCredentialFoundResponse: jestRuntime.fn(
    response => response?.type === 'noSavedCredentialFound',
  ),
  statusCodes: {
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
  },
}));
