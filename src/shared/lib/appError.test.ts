import { describeErrorSource, toError } from './appError';

describe('describeErrorSource', () => {
  it('labels each error source', () => {
    expect(describeErrorSource('render')).toBe('Render (JSX)');
    expect(describeErrorSource('fallback')).toBe('Error boundary');
    expect(describeErrorSource('uncaught')).toBe('Uncaught (event / async)');
    expect(describeErrorSource('promise')).toBe('Unhandled promise');
  });
});

describe('toError', () => {
  it('passes an Error through unchanged', () => {
    const error = new Error('boom');
    expect(toError(error)).toBe(error);
  });

  it('wraps a string as the message', () => {
    expect(toError('nope').message).toBe('nope');
  });

  it('serializes plain values to JSON', () => {
    expect(toError({ code: 42 }).message).toBe('{"code":42}');
    expect(toError(null).message).toBe('null');
  });

  it('falls back to String() when the value is not serializable', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(toError(circular).message).toBe('[object Object]');
  });
});
