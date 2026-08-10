import { couponsApi } from './coupons';

const mockGet = jest.fn();

jest.mock('./httpClient', () => ({
  httpClient: { get: (...args: unknown[]) => mockGet(...args) },
  toApiError: (error: unknown) => error,
}));

describe('couponsApi', () => {
  it('lists coupons with the given query params', async () => {
    const body = { items: [], indexerLag: { seconds: null }, nextCursor: null };
    mockGet.mockResolvedValue({ data: body });
    await expect(couponsApi.list({ limit: 10 })).resolves.toEqual(body);
    expect(mockGet).toHaveBeenCalledWith('/coupons', { params: { limit: 10 } });
  });

  it('URL-encodes the code when looking a coupon up', async () => {
    mockGet.mockResolvedValue({ data: { id: 'c1' } });
    await couponsApi.findByCode('a b/c');
    expect(mockGet).toHaveBeenCalledWith('/coupons/by-code/a%20b%2Fc');
  });

  it('wraps a transport error', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    await expect(couponsApi.findByCode('x')).rejects.toThrow('boom');
  });
});
