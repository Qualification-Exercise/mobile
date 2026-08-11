import { describeFeeError } from './feeError';

describe('describeFeeError', () => {
  it('explains a paymaster/insufficient failure with a single fee symbol', () => {
    const message = describeFeeError(
      'PAYMASTER_ERROR: pm_getPaymasterData',
      'USDT',
    );
    expect(message).toContain('Not enough USDT');
    expect(message).toContain('leave some spare');
  });

  it('lists multiple fee symbols with an "or" before the last', () => {
    expect(
      describeFeeError('insufficient allowance', ['USDT', 'ETH']),
    ).toContain('Not enough USDT or ETH');
    expect(
      describeFeeError('insufficient allowance', ['A', 'B', 'C']),
    ).toContain('Not enough A, B or C');
  });

  it('falls back to "Fee unavailable" for an empty or missing message', () => {
    expect(describeFeeError('', 'USDT')).toBe('Fee unavailable');
    expect(describeFeeError(null, 'USDT')).toBe('Fee unavailable');
    expect(describeFeeError(undefined, 'USDT')).toBe('Fee unavailable');
  });

  it('passes an unrelated message through unchanged', () => {
    expect(describeFeeError('Network unreachable', 'USDT')).toBe(
      'Network unreachable',
    );
  });
});
