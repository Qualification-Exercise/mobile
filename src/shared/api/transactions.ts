import { httpClient, toApiError } from './httpClient';
import type { CreateTransactionDTO } from './types';

export const transactionsApi = {
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
