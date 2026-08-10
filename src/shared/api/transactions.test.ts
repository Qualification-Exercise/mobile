import type { CreateTransactionDTO } from './types';
import { transactionsApi } from './transactions';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('./httpClient', () => ({
  httpClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  toApiError: (error: unknown) => error,
}));

const dto: CreateTransactionDTO = {
  chain: 'evm',
  srcChainId: 42161,
  txHash: '0xhash',
  direction: 'out',
  token: 'USDT',
  amount: '1000000',
  from: '0xfrom',
  to: '0xto',
};

describe('transactionsApi', () => {
  it('lists history with query params', async () => {
    const body = { items: [], page: { limit: 20, nextCursor: null } };
    mockGet.mockResolvedValue({ data: body });
    await expect(transactionsApi.list({ limit: 20 })).resolves.toEqual(body);
    expect(mockGet).toHaveBeenCalledWith('/transactions', {
      params: { limit: 20 },
    });
  });

  it('reports a broadcast with the tx hash as the idempotency key', async () => {
    mockPost.mockResolvedValue({ data: undefined });
    await transactionsApi.report(dto, dto.txHash);
    expect(mockPost).toHaveBeenCalledWith('/transactions', dto, {
      headers: { 'Idempotency-Key': '0xhash' },
    });
  });
});
