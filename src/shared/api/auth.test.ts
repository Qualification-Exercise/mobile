import type { AuthTokens } from './types';
import { authApi } from './auth';

const mockGooglePost = jest.fn();
const mockBarePost = jest.fn();

jest.mock('./httpClient', () => ({
  httpClient: { post: (...args: unknown[]) => mockGooglePost(...args) },
  toApiError: (error: unknown) => error,
}));

// `refresh` deliberately uses a bare axios instance (no auth interceptor), so
// the module builds its own client via `axios.create`.
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: () => ({ post: (...args: unknown[]) => mockBarePost(...args) }),
  },
}));

const tokens: AuthTokens = {
  accessToken: 'a',
  refreshToken: 'r',
  user: { id: 'u1', email: null, firstName: null, lastName: null },
};

describe('authApi.google', () => {
  it('exchanges an idToken for a session via httpClient', async () => {
    mockGooglePost.mockResolvedValue({ data: tokens });
    await expect(authApi.google('id-token', 'ios')).resolves.toEqual(tokens);
    expect(mockGooglePost).toHaveBeenCalledWith('/auth/google', {
      idToken: 'id-token',
      type: 'ios',
    });
  });

  it('wraps a login failure', async () => {
    mockGooglePost.mockRejectedValue(new Error('bad token'));
    await expect(authApi.google('x', 'android')).rejects.toThrow('bad token');
  });
});

describe('authApi.refresh', () => {
  it('exchanges a refresh token on the bare client', async () => {
    mockBarePost.mockResolvedValue({ data: tokens });
    await expect(authApi.refresh('refresh-token')).resolves.toEqual(tokens);
    expect(mockBarePost).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'refresh-token',
    });
  });
});
