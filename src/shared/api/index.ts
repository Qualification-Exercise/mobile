export { authApi } from './auth';
export { secretsApi } from './secrets';
export { httpClient, configureAuth, ApiError, toApiError } from './httpClient';
export type {
  AuthUser,
  AuthTokens,
  EClientType,
  ApiErrorEnvelope,
  SecretMetadata,
  SecretWriteMetadata,
  RemoteRecoveryBundle,
  StoreEntropyRequest,
  StoreSeedRequest,
  SecretItem,
  GetEntropyResponse,
  GetSeedResponse,
} from './types';
