import { backendRequest } from './client';
import type { LinkWalletsRequest, LinkedWallet } from './types';

export async function linkWallets(
  request: LinkWalletsRequest,
): Promise<{ wallets: LinkedWallet[] }> {
  return backendRequest<{ wallets: LinkedWallet[] }>('/wallets', {
    method: 'POST',
    body: request,
  });
}

export async function listLinkedWallets(): Promise<{
  wallets: LinkedWallet[];
}> {
  return backendRequest<{ wallets: LinkedWallet[] }>('/wallets');
}
