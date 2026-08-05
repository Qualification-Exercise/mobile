import { BACKEND_API_URL as ENV_BACKEND_API_URL } from '@env';

export const DEFAULT_BACKEND_API_URL = 'http://localhost:3000/api';

export function getBackendApiUrl(): string {
  const configured = ENV_BACKEND_API_URL?.trim();
  return configured || DEFAULT_BACKEND_API_URL;
}
