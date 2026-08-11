import type { CouponDTO } from '@shared/api';
import { toCoupon } from './Coupon';

function makeDto(overrides: Partial<CouponDTO> = {}): CouponDTO {
  return {
    id: 'c-1',
    code: 'ABC-123',
    status: 'ISSUED',
    paymentRef: 'ref-123456789',
    utlAmount: '1000000000000000000',
    expiresAt: null,
    claimable: true,
    sourcePayment: null,
    ...overrides,
  };
}

describe('toCoupon', () => {
  it('maps the flat fields and leaves source null when absent', () => {
    expect(toCoupon(makeDto())).toMatchObject({
      id: 'c-1',
      code: 'ABC-123',
      status: 'ISSUED',
      claimable: true,
      source: null,
    });
  });

  it('projects the nested source payment when present', () => {
    const coupon = toCoupon(
      makeDto({
        sourcePayment: {
          srcChainId: 42161,
          txHash: '0xhash',
          outputIndex: 0,
          asset: 'USDT',
          amount: '25000000',
          usdValue: '25',
          confirmations: 4,
          requiredConfirmations: 20,
        },
      }),
    );
    expect(coupon.source).toEqual({
      srcChainId: 42161,
      asset: 'USDT',
      amount: '25000000',
      usdValue: '25',
      confirmations: 4,
      requiredConfirmations: 20,
    });
  });
});
