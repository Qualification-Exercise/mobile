import { pricingApi } from './pricing';

const mockGet = jest.fn();

jest.mock('./httpClient', () => ({
  httpClient: { get: (...args: unknown[]) => mockGet(...args) },
  toApiError: (error: unknown) => error,
}));

describe('pricingApi.live', () => {
  it('joins the symbols and defaults the quote currency to USD', async () => {
    mockGet.mockResolvedValue({ data: { data: [] } });
    await pricingApi.live(['BTC', 'ETH']);
    expect(mockGet).toHaveBeenCalledWith('/pricing/live', {
      params: { fromSources: 'BTC,ETH', to: 'USD' },
    });
  });

  it('passes an explicit quote currency through and returns the body', async () => {
    const body = { data: [{ from: 'BTC', to: 'EUR', price: 1 }] };
    mockGet.mockResolvedValue({ data: body });
    await expect(pricingApi.live(['BTC'], 'EUR')).resolves.toEqual(body);
    expect(mockGet).toHaveBeenCalledWith('/pricing/live', {
      params: { fromSources: 'BTC', to: 'EUR' },
    });
  });

  it('wraps a transport error', async () => {
    mockGet.mockRejectedValue(new Error('down'));
    await expect(pricingApi.live(['BTC'])).rejects.toThrow('down');
  });
});
