import { useCallback } from 'react';
import { randomUUID } from 'expo-crypto';
import { hashMessage } from 'ethers';
import { AccountService } from '@wdk-internal/services/accountService';
import { claimsApi, type ClaimChallengeDTO, type ClaimDTO } from '@shared/api';
import { useEnsureWdkReady } from './useEnsureWdkReady';

// The claim is signed with the EVM key and paid out on Ethereum (Sepolia),
// where the CouponClaim contract lives.
const CLAIM_NETWORK = 'ethereum';

// `signTypedData` is not part of the published `useAccount` surface, but the
// ERC-4337 account implements it and the worklet bridge forwards any method
// by name — same escape hatch `useAssetTransfer` uses for its config override.
const callAccountMethod = AccountService.callAccountMethod as (
  network: string,
  accountIndex: number,
  methodName: string,
  ...args: unknown[]
) => Promise<unknown>;

// The EIP-712 payload a Safe accepts as proof of ownership.
//
// The wallet's address is a Safe (ERC-4337), not an EOA: signing the challenge
// as a plain string yields a signature that recovers to the Safe's *owner* key,
// which is not the payout address the backend compares against — hence
// OWNERSHIP_PROOF_INVALID. Wrapping it as a `SafeMessage` instead makes the
// signature verifiable through ERC-1271 (`isValidSignature` on the Safe), which
// is what actually proves control of that address.
//
// `message` is the EIP-191 hash of the challenge, matching what the Safe's
// fallback handler hashes internally: `isValidSignature(bytes32 dataHash, …)`
// re-encodes that same 32-byte hash as the `SafeMessage` body. The backend
// recomputes it from the challenge string it issued.
//
// The domain comes from the challenge, never from local config: the server
// verifies against the Safe on the chain the wallet is linked on, which is not
// the chain the reward is paid out on.
function safeMessageTypedData(challenge: ClaimChallengeDTO) {
  return {
    // Safe's domain separator is chain id + the Safe itself; it carries no
    // name or version.
    domain: {
      chainId: challenge.chainId,
      verifyingContract: challenge.verifyingContract,
    },
    types: {
      SafeMessage: [{ name: 'message', type: 'bytes' }],
    },
    message: {
      message: hashMessage(challenge.message),
    },
  };
}

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

  const claim = useCallback(
    async (couponCode: string): Promise<ClaimDTO> => {
      ensureWdkReady();

      // Fails with WALLET_NOT_LINKED when the account has no EVM wallet on
      // file — there is no address to prove control of, so no nonce is issued.
      const challenge = await claimsApi.challenge(couponCode);

      // The server's message is hashed verbatim: it is compared byte for byte,
      // and the nonce inside it burns after a single attempt.
      const signature = await callAccountMethod(
        CLAIM_NETWORK,
        0,
        'signTypedData',
        safeMessageTypedData(challenge),
      );
      if (typeof signature !== 'string' || !signature) {
        throw new Error('Could not sign the claim.');
      }

      return claimsApi.create(
        {
          challengeId: challenge.challengeId,
          signature,
          code: couponCode,
        },
        // Required by the backend. A fresh key per attempt: a retry after a
        // failure is a new claim, while an accidental double-submit of the
        // same attempt replays the first result.
        randomUUID(),
      );
    },
    [ensureWdkReady],
  );

  return { claim };
}
