import { walletsApi } from '../src/shared/api/wallets';

const mockGet = jest.fn();

// Mocked with a factory so the real module (and its config import chain) never
// loads — this test is only about how the response body is read.
jest.mock('../src/shared/api/httpClient', () => ({
  httpClient: { get: (...args: unknown[]) => mockGet(...args) },
  toApiError: (error: unknown) => error,
}));

// `GET /wallets` has answered with both shapes. Both must yield a usable array:
// a throw here reads as "wallet not linked" and blocks payment.
describe('walletsApi.list', () => {
  const row = { chain: 'evm', srcChainId: 11155111, address: '0xabc' };

  afterEach(() => mockGet.mockReset());

  it('accepts a bare array', async () => {
    mockGet.mockResolvedValue({ data: [row] });
    await expect(walletsApi.list()).resolves.toEqual([row]);
  });

  it('accepts the wrapped envelope', async () => {
    mockGet.mockResolvedValue({ data: { wallets: [row] } });
    await expect(walletsApi.list()).resolves.toEqual([row]);
  });
});
