import { walletsApi } from './wallets';

const mockGet = jest.fn();
const mockPost = jest.fn();

// Mocked with a factory so the real module (and its config import chain) never
// loads — this test is only about how the response body is read.
jest.mock('./httpClient', () => ({
  httpClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  toApiError: (error: unknown) => error,
}));

// `GET /wallets` has answered with both shapes. Both must yield a usable array:
// a throw here reads as "wallet not linked" and blocks payment.
describe('walletsApi.list', () => {
  const row = { chain: 'evm', srcChainId: 11155111, address: '0xabc' };

  it('accepts a bare array', async () => {
    mockGet.mockResolvedValue({ data: [row] });
    await expect(walletsApi.list()).resolves.toEqual([row]);
  });

  it('accepts the wrapped envelope', async () => {
    mockGet.mockResolvedValue({ data: { wallets: [row] } });
    await expect(walletsApi.list()).resolves.toEqual([row]);
  });

  it('falls back to an empty array for an unexpected body', async () => {
    mockGet.mockResolvedValue({ data: null });
    await expect(walletsApi.list()).resolves.toEqual([]);
  });
});

describe('walletsApi.link', () => {
  it('posts the wallets envelope', async () => {
    const body = {
      wallets: [{ chain: 'evm' as const, srcChainId: 1, address: '0x' }],
    };
    mockPost.mockResolvedValue({ data: undefined });
    await walletsApi.link(body);
    expect(mockPost).toHaveBeenCalledWith('/wallets', body);
  });
});
