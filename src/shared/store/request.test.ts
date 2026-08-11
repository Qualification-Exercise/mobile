import { Request } from './request';

const options = {
  initialData: [] as number[],
  defaultError: 'default error',
  loadingMessage: 'loading…',
};

describe('Request', () => {
  it('stores the resolved data and clears loading/error', async () => {
    const request = new Request(async () => [1, 2, 3], options);

    const data = await request.fetch();

    expect(data).toEqual([1, 2, 3]);
    expect(request.data).toEqual([1, 2, 3]);
    expect(request.loading).toBe(false);
    expect(request.error).toBe('');
    expect(request.hasData).toBe(true);
  });

  it('is empty and has no data before any fetch', () => {
    const request = new Request(async () => [1], options);
    expect(request.hasData).toBe(false);
  });

  it('records the error message on failure', async () => {
    const request = new Request(async () => {
      throw new Error('boom');
    }, options);

    await request.fetch();

    expect(request.error).toBe('boom');
    expect(request.loading).toBe(false);
  });

  it('falls back to the default error for a non-Error throw', async () => {
    const request = new Request(async () => {
      throw 'nope';
    }, options);

    await request.fetch();

    expect(request.error).toBe('default error');
  });

  it('uses a generic message when there is no default error', async () => {
    const request = new Request(
      async () => {
        throw 'nope';
      },
      { ...options, defaultError: '' },
    );

    await request.fetch();

    expect(request.error).toBe('Something went wrong, try again later');
  });
});
