import { secretsApi } from './secrets';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('./httpClient', () => ({
  httpClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  toApiError: (error: unknown) => error,
}));

describe('secretsApi', () => {
  it('stores entropy and seed at their endpoints', async () => {
    mockPost.mockResolvedValue({ data: undefined });
    const metadata = { version: 1 } as const;
    await secretsApi.storeEntropy({ entropy: 'e1', metadata });
    await secretsApi.storeSeed({ seed: 's1', metadata });
    expect(mockPost).toHaveBeenCalledWith('/secrets/entropy', {
      entropy: 'e1',
      metadata,
    });
    expect(mockPost).toHaveBeenCalledWith('/secrets/seed', {
      seed: 's1',
      metadata,
    });
  });

  it('unwraps the entropies and seeds arrays', async () => {
    mockGet.mockResolvedValueOnce({ data: { entropies: [{ entropy: 'e' }] } });
    await expect(secretsApi.getEntropy()).resolves.toEqual([{ entropy: 'e' }]);

    mockGet.mockResolvedValueOnce({ data: { seeds: [{ seed: 's' }] } });
    await expect(secretsApi.getSeed()).resolves.toEqual([{ seed: 's' }]);
  });
});
