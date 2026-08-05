import { backendRequest } from './client';
import type {
  GetSecretResponse,
  PutSecretRequest,
  StoredSecretResponse,
} from './types';

export async function putEntropySecret(
  body: PutSecretRequest,
): Promise<StoredSecretResponse> {
  return backendRequest<StoredSecretResponse>('/secrets/entropy', {
    method: 'PUT',
    body,
  });
}

export async function putSeedSecret(
  body: PutSecretRequest,
): Promise<StoredSecretResponse> {
  return backendRequest<StoredSecretResponse>('/secrets/seed', {
    method: 'PUT',
    body,
  });
}

export async function getEntropySecret(): Promise<GetSecretResponse> {
  return backendRequest<GetSecretResponse>('/secrets/entropy');
}

export async function getSeedSecret(): Promise<GetSecretResponse> {
  return backendRequest<GetSecretResponse>('/secrets/seed');
}

export async function deleteSecrets(): Promise<void> {
  await backendRequest<void>('/secrets', { method: 'DELETE' });
}
