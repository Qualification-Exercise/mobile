import { findAssetConfig, getAssetConfig } from '@shared/config';
import { fromBaseUnits } from '@shared/lib';
import { colors } from '@shared/ui';
import type { Coupon } from './Coupon';

// UTL decimals come from the asset registry so the payout token has one source
// of truth; 18 is the ERC-20 default the contract was deployed with.
const UTL_DECIMALS = getAssetConfig('utl-ethereum')?.decimals ?? 18;

// Cashback in UTL as a human string, or '—' while the coupon is still pending
// (the amount is only known once the payment is confirmed and priced).
export function getCouponAmount(coupon: Pick<Coupon, 'utlAmount'>): string {
  if (!coupon.utlAmount) {
    return '—';
  }
  return fromBaseUnits(coupon.utlAmount, UTL_DECIMALS);
}

// Short, user-facing status. A pending coupon reports its confirmation
// progress instead of a status word, since that is the only actionable
// information at that point.
export function getCouponStatusLabel(coupon: Coupon): string {
  if (coupon.status === 'PENDING') {
    const seen = coupon.source?.confirmations;
    const need = coupon.source?.requiredConfirmations;
    return seen != null && need != null
      ? `Confirming ${seen}/${need}`
      : 'Confirming';
  }
  if (coupon.claimable) {
    return 'Claimable';
  }
  return STATUS_LABELS[coupon.status] ?? coupon.status;
}

const STATUS_LABELS: Record<string, string> = {
  ISSUED: 'Issued',
  PENDING_ATTESTATION: 'Verifying',
  ATTESTED: 'Verified',
  CLAIM_SUBMITTED: 'Paying out',
  CLAIMED: 'Claimed',
  EXPIRED: 'Expired',
  ORPHANED: 'Orphaned',
};

export function getCouponStatusColor(coupon: Coupon): string {
  if (coupon.claimable) {
    return colors.positive;
  }
  if (coupon.status === 'EXPIRED' || coupon.status === 'ORPHANED') {
    return colors.negative;
  }
  return colors.textTertiary;
}

// Tint for the coupon's leading icon, keyed off the coupon's lifecycle stage:
// pink while it can be claimed, blue while its payment is still confirming, and
// green once claimed. Anything in between keeps the neutral brand purple.
export function getCouponIconColor(coupon: Coupon): string {
  if (coupon.claimable) {
    return colors.pink;
  }
  if (coupon.status === 'PENDING') {
    return colors.blue;
  }
  if (coupon.status === 'CLAIMED') {
    return colors.positive;
  }
  return '#8B5CF6';
}

// What the payment behind the coupon was, e.g. `0.01 USDT`. Falls back to the
// payment reference when the indexer has not attached the payment yet.
export function getCouponSubtitle(coupon: Coupon): string {
  const source = coupon.source;
  if (!source) {
    return coupon.paymentRef.slice(0, 10);
  }
  const config = findAssetConfig('evm', source.srcChainId, source.asset);
  const decimals = config?.decimals ?? 6;
  return `${fromBaseUnits(source.amount, decimals)} ${source.asset}`;
}

// Sum of the claimable coupons' UTL, in base units.
export function sumClaimableUtl(coupons: Coupon[]): bigint {
  return coupons.reduce(
    (total, coupon) =>
      coupon.claimable && coupon.utlAmount
        ? total + BigInt(coupon.utlAmount)
        : total,
    0n,
  );
}

export function formatUtl(baseUnits: bigint): string {
  return fromBaseUnits(baseUnits.toString(), UTL_DECIMALS);
}
