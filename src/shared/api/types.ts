// Shape of the authenticated user returned by the backend. String fields are
// nullable per the backend contract; only `id` is guaranteed.
export type AuthUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

// The token/session bundle returned by both `/auth/google` and `/auth/refresh`.
export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

// Mirror of the backend's client-type enum, sent with the Google login body.
export type EClientType = 'ios' | 'android';

// The error envelope produced by the backend `GlobalExceptionFilter`.
export type ApiErrorEnvelope = {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  error?: string;
  additional_data?: unknown;
};

export type SecretMetadata = {
  mnemonicHash?: string;
  encryptionKey?: string;
  version?: number;
};

export type StoreEntropyRequest = {
  entropy: string;
  metadata?: SecretMetadata;
};

export type StoreSeedRequest = {
  seed: string;
  metadata?: SecretMetadata;
};

export type SecretItem = {
  entropy?: string;
  seed?: string;
  metadata?: SecretMetadata;
};

export type GetEntropyResponse = {
  entropies: SecretItem[];
};

export type GetSeedResponse = {
  seeds: SecretItem[];
};
