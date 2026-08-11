import { httpClient, toApiError } from './httpClient';
import type { CreateTransactionDTO, ListTransactionsResponse } from './types';

export const transactionsApi = {
  // The user's transaction history, newest first. Rows come from two writers:
  // the payment indexer and this device's own `report()` calls.
  async list(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<ListTransactionsResponse> {
    try {
      const { data } = await httpClient.get<ListTransactionsResponse>(
        '/transactions',
        { params },
      );
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Report a broadcast transfer for confirmation tracking. The backend never
  // moves funds — this only records a hash the client already broadcast.
  //
  // `idempotencyKey` should be the broadcast `txHash`: it is unique per
  // broadcast, so retries replay idempotently (a repeat returns 200 rather
  // than creating a duplicate row).
  async report(
    body: CreateTransactionDTO,
    idempotencyKey: string,
  ): Promise<void> {
    try {
      await httpClient.post('/transactions', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
    } catch (error) {
      throw toApiError(error);
    }
  },
};
