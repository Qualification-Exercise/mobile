// Imported from the module rather than the `@shared/lib` barrel: the barrel
// also pulls in native Expo modules that have no place in a pure unit test.
import { formatAmount } from '@shared/lib/units';

describe('formatAmount', () => {
  test('pads to two fraction digits', () => {
    expect(formatAmount('1500000', 6)).toBe('1.50');
    expect(formatAmount('2000000', 6)).toBe('2.00');
    expect(formatAmount('0', 8)).toBe('0.00');
  });

  test('keeps up to six fraction digits', () => {
    expect(formatAmount('1234567', 6)).toBe('1.234567');
    expect(formatAmount('1000100', 6)).toBe('1.0001');
  });

  test('truncates past the sixth digit rather than rounding up', () => {
    // 0.999999999 ETH must never read as 1.
    expect(formatAmount('999999999000000000', 18)).toBe('0.999999');
  });
});
