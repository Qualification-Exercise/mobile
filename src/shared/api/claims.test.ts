import { claimsApi } from './claims';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('./httpClient', () => ({
  httpClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  toApiError: (error: unknown) => error,
}));

describe('claimsApi', () => {
  it('requests a challenge bound to a coupon code', async () => {
    mockGet.mockResolvedValue({ data: { challengeId: 'ch1' } });
    await claimsApi.challenge('CODE');
    expect(mockGet).toHaveBeenCalledWith('/claims/challenge', {
      params: { coupon: 'CODE' },
    });
  });

  it('submits a claim with the idempotency key as a header', async () => {
    const body = { challengeId: 'ch1', signature: '0xsig' };
    mockPost.mockResolvedValue({ data: { claimId: 'cl1' } });
    await claimsApi.create(body, 'key-123');
    expect(mockPost).toHaveBeenCalledWith('/claims', body, {
      headers: { 'Idempotency-Key': 'key-123' },
    });
  });

  it('fetches a claim by id', async () => {
    mockGet.mockResolvedValue({ data: { claimId: 'cl1' } });
    await claimsApi.get('cl1');
    expect(mockGet).toHaveBeenCalledWith('/claims/cl1');
  });
});
