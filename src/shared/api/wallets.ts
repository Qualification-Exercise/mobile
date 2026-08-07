import { httpClient, toApiError } from './httpClient';
import type { LinkWalletsRequest, ListWalletsResponse } from './types';

export const walletsApi = {
  // Register the user's derived per-chain addresses. The EVM address is
  // required by the backend (it is the cashback payout recipient).
  async link(body: LinkWalletsRequest): Promise<void> {
    try {
      await httpClient.post('/wallets', body);
    } catch (error) {
      throw toApiError(error);
    }
  },

  // List the addresses already linked to the user's account.
  async list(): Promise<ListWalletsResponse> {
    try {
      const { data } = await httpClient.get<ListWalletsResponse>('/wallets');
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
