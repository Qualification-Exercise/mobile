import { httpClient, toApiError } from './httpClient';
import type { ClaimChallengeDTO, ClaimDTO, CreateClaimRequest } from './types';

export const claimsApi = {
  // Ask for a challenge bound to one coupon. The returned `message` is what
  // gets signed — never rebuild it client-side, the server compares the exact
  // string it issued.
  async challenge(couponCode: string): Promise<ClaimChallengeDTO> {
    try {
      const { data } = await httpClient.get<ClaimChallengeDTO>(
        '/claims/challenge',
        { params: { coupon: couponCode } },
      );
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Submit the signed challenge. Accepted (202) for asynchronous relaying —
  // the payout is not on-chain yet; poll `get()` for the outcome.
  //
  // `idempotencyKey` is required by the backend: a repeat with the same key
  // and body replays the first result instead of creating a second claim.
  async create(
    body: CreateClaimRequest,
    idempotencyKey: string,
  ): Promise<ClaimDTO> {
    try {
      const { data } = await httpClient.post<ClaimDTO>('/claims', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async get(claimId: string): Promise<ClaimDTO> {
    try {
      const { data } = await httpClient.get<ClaimDTO>(`/claims/${claimId}`);
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
