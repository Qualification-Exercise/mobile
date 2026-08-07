export type CouponStatus = 'Claimable' | 'Claimed';

export type Coupon = {
  code: string;
  merchant: string;
  amount: number;
  status: CouponStatus;
};
