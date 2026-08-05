import { backendRequest } from './client';
import type { BackendConfig } from './types';

export async function getBackendConfig(): Promise<BackendConfig> {
  return backendRequest<BackendConfig>('/config', { auth: false });
}
