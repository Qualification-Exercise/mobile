import { useCallback } from 'react';
import { randomUUID } from 'expo-crypto';
import { useAccount } from '@tetherto/wdk-react-native-core';
import { claimsApi, type ClaimDTO } from '@shared/api';
import { useEnsureWdkReady } from './useEnsureWdkReady';

// The claim is signed with the EVM key and paid out on Ethereum (Sepolia),
// where the CouponClaim contract lives.
const CLAIM_NETWORK = 'ethereum';

export interface UseClaimCouponResult {
  // Claim one coupon by its redeem code: fetch a challenge, sign it with the
  // wallet key, and submit it. Resolves once the backend has accepted the
  // claim for relaying — the payout is not on-chain yet.
  //
  // @throws {ApiError} If the backend rejects the challenge or the claim.
  // @throws {Error} If the wallet cannot sign (locked, or WDK not ready).
  claim: (couponCode: string) => Promise<ClaimDTO>;
}

export function useClaimCoupon(): UseClaimCouponResult {
  const ensureWdkReady = useEnsureWdkReady();
  const account = useAccount<object>({
    accountIndex: 0,
    network: CLAIM_NETWORK,
  });

  const claim = useCallback(
    async (couponCode: string): Promise<ClaimDTO> => {
      ensureWdkReady();

      const challenge = await claimsApi.challenge(couponCode);

      // Sign the server's message verbatim: it is compared byte for byte, and
      // the nonce inside it burns after a single attempt.
      const signed = await account.sign(challenge.message);
      if (!signed.success || !signed.signature) {
        throw new Error(signed.error ?? 'Could not sign the claim.');
      }

      return claimsApi.create(
        {
          challengeId: challenge.challengeId,
          signature: signed.signature,
          code: couponCode,
        },
        // Required by the backend. A fresh key per attempt: a retry after a
        // failure is a new claim, while an accidental double-submit of the
        // same attempt replays the first result.
        randomUUID(),
      );
    },
    [ensureWdkReady, account],
  );

  return { claim };
}
