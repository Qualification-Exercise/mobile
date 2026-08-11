import type { CouponDTO } from '@shared/api';

// Mirrors the backend coupon state machine. `PENDING` is not a stored state:
// it is a projection of a payment that has not reached confirmation depth
// yet, which is what lets the UI show "4 / 20" instead of a blank spinner.
export type CouponStatus = CouponDTO['status'];

export type CouponSource = {
  srcChainId: number;
  asset: string;
  // Payment amount in the token's smallest unit.
  amount: string;
  usdValue: string | null;
  confirmations: number | null;
  requiredConfirmations: number;
};

export type Coupon = {
  id: string;
  // Null until the coupon is issued (a pending payment has no redeem code).
  code: string | null;
  status: CouponStatus;
  paymentRef: string;
  // Cashback in UTL base units (18 decimals); null while still pending.
  utlAmount: string | null;
  expiresAt: string | null;
  claimable: boolean;
  source: CouponSource | null;
};

export function toCoupon(dto: CouponDTO): Coupon {
  return {
    id: dto.id,
    code: dto.code,
    status: dto.status,
    paymentRef: dto.paymentRef,
    utlAmount: dto.utlAmount,
    expiresAt: dto.expiresAt,
    claimable: dto.claimable,
    source: dto.sourcePayment
      ? {
          srcChainId: dto.sourcePayment.srcChainId,
          asset: dto.sourcePayment.asset,
          amount: dto.sourcePayment.amount,
          usdValue: dto.sourcePayment.usdValue,
          confirmations: dto.sourcePayment.confirmations,
          requiredConfirmations: dto.sourcePayment.requiredConfirmations,
        }
      : null,
  };
}
