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

// Body for `POST /api/transactions`. `amount`/`fee` are base-unit integer
// strings (`^\d{1,78}$`); `srcChainId` is the EVM chain id (omitted for
// non-EVM chains, which the backend ingests but does not yet confirm).
export type CreateTransactionDTO = {
  chain: string;
  srcChainId?: number;
  txHash: string;
  type: 'TRANSFER';
  direction: 'out';
  token: string;
  amount: string;
  from: string;
  to: string;
  fee?: string;
  broadcastAt?: string;
};

// A single derived address linked to the user's account via `POST /api/wallets`.
export type LinkedWalletDTO = {
  chain: string;
  srcChainId?: number;
  address: string;
  path?: string;
};

export type LinkWalletsRequest = {
  wallets: LinkedWalletDTO[];
};

export type ListWalletsResponse = {
  wallets: LinkedWalletDTO[];
};
