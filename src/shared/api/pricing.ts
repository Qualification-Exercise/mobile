import { httpClient, toApiError } from './httpClient';
import type { LivePricingResponse } from './types';

export const pricingApi = {
  // Spot prices for `symbols`, quoted in `to`. Public — no token required, so
  // it works before sign-in too. An asset with no market comes back with a
  // null price rather than failing the whole call.
  async live(symbols: string[], to = 'USD'): Promise<LivePricingResponse> {
    try {
      const { data } = await httpClient.get<LivePricingResponse>(
        '/pricing/live',
        { params: { fromSources: symbols.join(','), to } },
      );
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
