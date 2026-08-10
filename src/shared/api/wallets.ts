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

  // List the addresses already linked to the user's account. The backend has
  // shipped both shapes — a bare array and the `POST /wallets` envelope — and a
  // non-array here used to throw inside the caller's `.find`, which read as
  // "not linked" forever even though linking returned 200.
  async list(): Promise<ListWalletsResponse> {
    try {
      const { data } = await httpClient.get<
        ListWalletsResponse | { wallets: ListWalletsResponse }
      >('/wallets');
      return Array.isArray(data) ? data : data?.wallets ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  },
};
