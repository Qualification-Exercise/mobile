// Global test harness. Mocks the native modules that the logic layers import
// transitively, so pure unit tests never pull in real Expo/native code. Each
// mock ships a sensible happy-path default; individual tests override per case
// (e.g. `mockResolvedValueOnce`). `clearMocks` (jest.config.js) resets call
// history between tests but keeps these default implementations.

// WDK core: the asset registry constructs `BaseAsset` at module load, which is
// the only WDK symbol reached from the logic layers under test.
jest.mock('@tetherto/wdk-react-native-core', () => ({
  __esModule: true,
  BaseAsset: class BaseAsset {
    config: unknown;
    constructor(config: unknown) {
      this.config = config;
    }
  },
}));

// Google Sign-In (ESM; also needs stubbing for AuthStore).
jest.mock('@react-native-google-signin/google-signin', () => ({
  __esModule: true,
  GoogleSignin: {
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ data: { idToken: 'id-token' } }),
    getTokens: jest.fn().mockResolvedValue({ idToken: 'id-token' }),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
  isSuccessResponse: jest.fn().mockReturnValue(true),
  isErrorWithCode: jest.fn().mockReturnValue(false),
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
  },
}));

// Network connectivity (@react-native-community/netinfo). Defaults to online;
// individual tests override to simulate an offline device.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn().mockResolvedValue({ isConnected: true }) },
}));

// Secure storage (react-native-keychain).
jest.mock('react-native-keychain', () => ({
  __esModule: true,
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

// Biometrics (expo-local-authentication).
jest.mock('expo-local-authentication', () => ({
  __esModule: true,
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  getEnrolledLevelAsync: jest.fn().mockResolvedValue(3),
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

// Crypto (expo-crypto). Deterministic digest so hash assertions are stable.
jest.mock('expo-crypto', () => ({
  __esModule: true,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn((_algo: string, value: string) =>
    Promise.resolve(`sha256:${value}`),
  ),
  randomUUID: jest.fn().mockReturnValue('00000000-0000-0000-0000-000000000000'),
}));

// Toast notifications.
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));

// Icon font (ESM, and loads native font assets). The `@shared/ui` barrel is
// re-exported wholesale by the model display helpers, so it must load cleanly
// even though the logic layers only read `colors` from it.
jest.mock('@expo/vector-icons', () => ({
  __esModule: true,
  Ionicons: () => null,
}));
