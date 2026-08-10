import { formatAmount, fromBaseUnits, toBaseUnits } from './units';

describe('formatAmount', () => {
  it('pads to two fraction digits', () => {
    expect(formatAmount('1500000', 6)).toBe('1.50');
    expect(formatAmount('2000000', 6)).toBe('2.00');
    expect(formatAmount('0', 8)).toBe('0.00');
  });

  it('keeps up to six fraction digits and trims trailing zeros', () => {
    expect(formatAmount('1234567', 6)).toBe('1.234567');
    expect(formatAmount('1000100', 6)).toBe('1.0001');
  });

  it('truncates past the sixth digit rather than rounding up', () => {
    expect(formatAmount('999999999000000000', 18)).toBe('0.999999');
  });
});

describe('toBaseUnits', () => {
  it('scales a whole number by the token decimals', () => {
    expect(toBaseUnits('1', 6)).toBe('1000000');
  });

  it('scales a fractional amount', () => {
    expect(toBaseUnits('1.5', 6)).toBe('1500000');
  });

  it('handles a leading decimal point', () => {
    expect(toBaseUnits('.5', 6)).toBe('500000');
  });

  it('handles a trailing decimal point', () => {
    expect(toBaseUnits('1.', 6)).toBe('1000000');
  });

  it('returns "0" for zero', () => {
    expect(toBaseUnits('0', 6)).toBe('0');
  });

  it('strips leading zeros from the integer part', () => {
    expect(toBaseUnits('007', 6)).toBe('7000000');
  });

  it('truncates fractional digits beyond the token decimals', () => {
    // 7 fractional digits, only 6 are representable — the last is dropped.
    expect(toBaseUnits('1.1234567', 6)).toBe('1123456');
  });

  it('keeps full precision for high-decimal tokens (no float rounding)', () => {
    expect(toBaseUnits('1.000000000000000001', 18)).toBe('1000000000000000001');
  });

  it('supports zero-decimal tokens', () => {
    expect(toBaseUnits('5.9', 0)).toBe('5');
  });

  it.each(['', '.', 'abc', '1.2.3', '-1', '1,5'])(
    'throws on malformed input %p',
    input => {
      expect(() => toBaseUnits(input, 6)).toThrow();
    },
  );
});

describe('fromBaseUnits', () => {
  it('formats a whole-token amount', () => {
    expect(fromBaseUnits('1000000', 6)).toBe('1');
  });

  it('formats a fractional amount', () => {
    expect(fromBaseUnits('1500000', 6)).toBe('1.5');
  });

  it('renders a sub-unit amount with a leading zero', () => {
    expect(fromBaseUnits('1', 6)).toBe('0.000001');
  });

  it('trims trailing zeros in the fractional part', () => {
    expect(fromBaseUnits('1230000', 6)).toBe('1.23');
  });

  it('returns "0" for zero', () => {
    expect(fromBaseUnits('0', 6)).toBe('0');
  });

  it('keeps full precision for high-decimal tokens', () => {
    expect(fromBaseUnits('1000000000000000001', 18)).toBe(
      '1.000000000000000001',
    );
  });

  it('supports zero-decimal tokens', () => {
    expect(fromBaseUnits('007', 0)).toBe('7');
  });

  it.each(['', '1.5', 'abc', '-1'])('throws on non-integer input %p', input => {
    expect(() => fromBaseUnits(input, 6)).toThrow();
  });
});

describe('toBaseUnits/fromBaseUnits round trip', () => {
  it.each([
    ['123.456', 6],
    ['0.5', 8],
    ['1', 18],
    ['1000', 6],
  ] as const)('preserves %p at %p decimals', (human, decimals) => {
    expect(fromBaseUnits(toBaseUnits(human, decimals), decimals)).toBe(human);
  });
});
