import { TypedRequest } from './typedRequest';

describe('TypedRequest', () => {
  it('stores resolved data and reports hasData for a non-empty array', async () => {
    const request = new TypedRequest<number[]>(async () => [1], {
      initialData: [],
      defaultError: 'err',
      loadingMessage: '',
    });

    await request.fetch();

    expect(request.data).toEqual([1]);
    expect(request.hasData).toBe(true);
  });

  it('treats an empty string / null scalar as no data', async () => {
    const empty = new TypedRequest<string>(async () => '', {
      initialData: '',
      defaultError: 'err',
      loadingMessage: '',
    });
    await empty.fetch();
    expect(empty.hasData).toBe(false);

    const filled = new TypedRequest<string>(async () => 'value', {
      initialData: '',
      defaultError: 'err',
      loadingMessage: '',
    });
    await filled.fetch();
    expect(filled.hasData).toBe(true);
  });

  it('records the error message on failure', async () => {
    const request = new TypedRequest<number[]>(
      async () => {
        throw new Error('boom');
      },
      { initialData: [], defaultError: 'err', loadingMessage: '' },
    );

    await request.fetch();

    expect(request.error).toBe('boom');
    expect(request.loading).toBe(false);
  });

  it('uses a generic message for a non-Error throw with no default', async () => {
    const request = new TypedRequest<number[]>(
      async () => {
        throw 'nope';
      },
      { initialData: [], defaultError: '', loadingMessage: '' },
    );

    await request.fetch();

    expect(request.error).toBe('Something went wrong, try again later');
  });
});
