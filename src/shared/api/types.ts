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

// The backend's chain family. Every EVM network reports as `evm`; `srcChainId`
// is what tells them apart.
export type ChainKindDTO = 'evm' | 'tron' | 'bitcoin' | 'spark';

export type TxFeeDTO = {
  // Fee token symbol, e.g. `USDT`.
  token: string;
  // Fee in the token's smallest unit, integer string.
  amount: string;
};

// Body for `POST /api/transactions`. `amount`/`fee.amount` are base-unit
// integer strings (`^\d{1,78}$`); `srcChainId` is the EVM chain id, or the
// synthetic id used for UTXO chains.
export type CreateTransactionDTO = {
  chain: ChainKindDTO;
  srcChainId: number;
  txHash: string;
  outputIndex?: number;
  // Mirrors the backend's `ETxType`, which is lower-case.
  type?: 'payment' | 'claim' | 'transfer';
  direction: 'in' | 'out';
  token: string;
  amount: string;
  from: string;
  to: string;
  fee?: TxFeeDTO;
  broadcastAt?: string;
};

// A history row from `GET /api/transactions`. History has two writers — the
// payment indexer and the device — so a row may exist that this app never
// reported.
export type TransactionDTO = {
  id: string;
  type: string;
  chain: ChainKindDTO;
  srcChainId: number;
  txHash: string;
  outputIndex: number;
  direction: 'in' | 'out';
  token: string;
  amount: string;
  usdValue: string | null;
  from: string;
  to: string;
  fee: TxFeeDTO | null;
  status: 'pending' | 'confirmed' | 'failed' | string;
  failureReason: string | null;
  confirmations: number | null;
  requiredConfirmations: number;
  claimId: string | null;
  source: string;
  at: string;
};

export type ListTransactionsResponse = {
  items: TransactionDTO[];
  page: { limit: number; nextCursor: string | null };
};

// The payment a coupon was accrued from. Present once the indexer has seen it.
export type CouponSourcePaymentDTO = {
  srcChainId: number;
  txHash: string;
  outputIndex: number;
  asset: string;
  amount: string;
  usdValue: string | null;
  confirmations: number | null;
  requiredConfirmations: number;
};

// A cashback coupon. `PENDING` rows are a projection of a payment that has not
// reached confirmation depth yet: they have no `code` and no `utlAmount`.
export type CouponDTO = {
  id: string;
  code: string | null;
  status:
    | 'PENDING'
    | 'ISSUED'
    | 'PENDING_ATTESTATION'
    | 'ATTESTED'
    | 'CLAIM_SUBMITTED'
    | 'CLAIMED'
    | 'EXPIRED'
    | 'ORPHANED';
  paymentRef: string;
  // UTL in base units (18 decimals); null while the coupon is still pending.
  utlAmount: string | null;
  expiresAt: string | null;
  claimable: boolean;
  sourcePayment: CouponSourcePaymentDTO | null;
};

export type ListCouponsResponse = {
  items: CouponDTO[];
  indexerLag: { seconds: number | null };
  nextCursor: string | null;
};

// The challenge to sign before claiming. `message` must be signed verbatim
// with `personal_sign` (EIP-191); the nonce burns after one attempt.
export type ClaimChallengeDTO = {
  challengeId: string;
  nonce: string;
  message: string;
  expiresAt: string;
};

export type CreateClaimRequest = {
  challengeId: string;
  signature: string;
  // Exactly one of the two identifies the coupon.
  couponId?: string;
  code?: string;
};

export type ClaimCreatedDTO = {
  claimId: string;
  couponId: string;
  status: string;
  paymentRef: string;
  amount: string;
};

export type ClaimDTO = {
  claimId: string;
  couponId: string;
  status:
    | 'PENDING_ATTESTATION'
    | 'ATTESTED'
    | 'CLAIM_SUBMITTED'
    | 'CLAIMED'
    | 'FAILED'
    | 'EXPIRED';
  chainId: number;
  txHash: string | null;
  paymentRef: string;
  amount: string;
  attestations: { have: number; need: number };
  confirmations: number | null;
  failureReason: string | null;
  failureDetail: string | null;
  updatedAt: string;
};

// A single derived address linked to the user's account. `chain` is the
// family and `srcChainId` the backend's own id for the chain — required on
// every entry, including the ones with no chain id of their own.
export type LinkedWalletDTO = {
  chain: ChainKindDTO;
  srcChainId: number;
  address: string;
  path?: string;
};

export type LinkWalletsRequest = {
  wallets: LinkedWalletDTO[];
};

export type ListWalletsResponse = {
  wallets: LinkedWalletDTO[];
};

// A spot price from `GET /pricing/live`. `price` is null for an asset the
// upstream has no market for.
export type LivePrice = {
  from: string;
  to: string;
  price: number | string | null;
};

export type LivePricingResponse = {
  data: LivePrice[];
};
