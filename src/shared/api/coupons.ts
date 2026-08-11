import { httpClient, toApiError } from './httpClient';
import type { CouponDTO, ListCouponsResponse } from './types';

export const couponsApi = {
  // The user's cashback coupons, newest first. Cursor-paginated; the first
  // page is all the rewards screen needs.
  async list(params?: {
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ListCouponsResponse> {
    try {
      const { data } = await httpClient.get<ListCouponsResponse>('/coupons', {
        params,
      });
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Look a coupon up by its redeem code. The code may be typed with or
  // without dashes and in any case — the backend normalises it. An unknown
  // code and someone else's coupon both answer `404 COUPON_NOT_FOUND`.
  async findByCode(code: string): Promise<CouponDTO> {
    try {
      const { data } = await httpClient.get<CouponDTO>(
        `/coupons/by-code/${encodeURIComponent(code)}`,
      );
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
