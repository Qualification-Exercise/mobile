export type BackendClientType = 'ios' | 'android' | 'web';

export type AuthUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type SecretsKdfFloor = {
  algo: 'argon2id';
  m: number;
  t: number;
  p: number;
  minPassphraseLength: number;
  minZxcvbnScore: number;
};

export type BackendConfig = {
  utlUsdRate: number;
  cashbackBps: number;
  cashbackRate: number;
  confirmationDepths: Record<string, number>;
  secretsKdfFloor: SecretsKdfFloor;
  pageSize: number;
};

export type ChainKind = 'evm' | 'tron' | 'bitcoin' | 'spark';

export type LinkWalletEntry = {
  chain: ChainKind;
  srcChainId: number;
  address: string;
  path?: string;
};

export type LinkWalletsRequest = {
  wallets: LinkWalletEntry[];
};

export type LinkedWallet = {
  chain: ChainKind;
  srcChainId: number;
  address: string;
  primary: boolean;
  verified: boolean;
  linkedAt: string;
};

export type KdfParams = {
  algo: 'argon2id';
  salt: string;
  m: number;
  t: number;
  p: number;
};

export type WrappedKeyPayload = {
  ciphertext: string;
  kdf: KdfParams;
  cipher: 'aes-256-gcm';
  version: number;
};

export type SecretMetadata = {
  address: string;
  wordCount: 12 | 24;
};

export type PutSecretRequest = {
  entropy?: string;
  seed?: string;
  wrappedKey?: WrappedKeyPayload;
  metadata: SecretMetadata;
};

export type StoredSecretResponse = {
  stored: 'entropy' | 'seed';
  wordCount: number;
  updatedAt: string;
};

export type GetSecretResponse = {
  entropy?: string;
  seed?: string;
  wrappedKey: WrappedKeyPayload;
  metadata: SecretMetadata;
  updatedAt: string;
};

export type BackendApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export class BackendApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
