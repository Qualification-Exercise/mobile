import { colors } from '@shared/ui/tokens';
import type { Coupon } from './Coupon';
import {
  formatUtl,
  getCouponAmount,
  getCouponIconColor,
  getCouponStatusColor,
  getCouponStatusLabel,
  getCouponSubtitle,
  sumClaimableUtl,
} from './couponDisplay';

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'c-1',
    code: 'ABC-123',
    status: 'ISSUED',
    paymentRef: 'ref-123456789',
    utlAmount: '1000000000000000000',
    expiresAt: null,
    claimable: false,
    source: null,
    ...overrides,
  };
}

describe('getCouponAmount', () => {
  it('formats UTL base units, or a dash while pending', () => {
    expect(getCouponAmount({ utlAmount: '1000000000000000000' })).toBe('1');
    expect(getCouponAmount({ utlAmount: null })).toBe('—');
  });
});

describe('getCouponStatusLabel', () => {
  it('reports confirmation progress while pending', () => {
    expect(
      getCouponStatusLabel(
        makeCoupon({
          status: 'PENDING',
          source: {
            srcChainId: 42161,
            asset: 'USDT',
            amount: '1',
            usdValue: null,
            confirmations: 4,
            requiredConfirmations: 20,
          },
        }),
      ),
    ).toBe('Confirming 4/20');
    expect(getCouponStatusLabel(makeCoupon({ status: 'PENDING' }))).toBe(
      'Confirming',
    );
  });

  it('prefers Claimable, then the status label', () => {
    expect(getCouponStatusLabel(makeCoupon({ claimable: true }))).toBe(
      'Claimable',
    );
    expect(getCouponStatusLabel(makeCoupon({ status: 'CLAIMED' }))).toBe(
      'Claimed',
    );
  });
});

describe('getCouponStatusColor', () => {
  it('is positive when claimable, negative when dead, tertiary otherwise', () => {
    expect(getCouponStatusColor(makeCoupon({ claimable: true }))).toBe(
      colors.positive,
    );
    expect(getCouponStatusColor(makeCoupon({ status: 'EXPIRED' }))).toBe(
      colors.negative,
    );
    expect(getCouponStatusColor(makeCoupon())).toBe(colors.textTertiary);
  });
});

describe('getCouponIconColor', () => {
  it('tints by lifecycle stage', () => {
    expect(getCouponIconColor(makeCoupon({ claimable: true }))).toBe(
      colors.pink,
    );
    expect(getCouponIconColor(makeCoupon({ status: 'PENDING' }))).toBe(
      colors.blue,
    );
    expect(getCouponIconColor(makeCoupon({ status: 'CLAIMED' }))).toBe(
      colors.positive,
    );
    expect(getCouponIconColor(makeCoupon())).toBe('#8B5CF6');
  });
});

describe('getCouponSubtitle', () => {
  it('describes the source payment, or falls back to the payment ref', () => {
    expect(
      getCouponSubtitle(
        makeCoupon({
          source: {
            srcChainId: 42161,
            asset: 'USDT',
            amount: '25000000',
            usdValue: null,
            confirmations: null,
            requiredConfirmations: 20,
          },
        }),
      ),
    ).toBe('25 USDT');
    expect(getCouponSubtitle(makeCoupon())).toBe('ref-123456');
  });
});

describe('sumClaimableUtl / formatUtl', () => {
  it('sums only claimable coupons that carry an amount', () => {
    const total = sumClaimableUtl([
      makeCoupon({ claimable: true, utlAmount: '1000000000000000000' }),
      makeCoupon({ claimable: false, utlAmount: '5000000000000000000' }),
      makeCoupon({ claimable: true, utlAmount: null }),
    ]);
    expect(total).toBe(1_000_000_000_000_000_000n);
    expect(formatUtl(total)).toBe('1');
  });
});
