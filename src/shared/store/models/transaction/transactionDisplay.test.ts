import { colors } from '@shared/ui/tokens';
import {
  getTransactionAmount,
  getTransactionColor,
  getTransactionIconName,
  getTransactionTitle,
} from './transactionDisplay';

describe('transaction display helpers', () => {
  it('presents an incoming transfer as a positive credit', () => {
    expect(getTransactionIconName({ direction: 'in' })).toBe('arrow-down');
    expect(getTransactionColor({ direction: 'in' })).toBe(colors.positive);
    expect(getTransactionTitle({ direction: 'in' })).toBe('Received');
    expect(
      getTransactionAmount({
        direction: 'in',
        amountBaseUnits: '1500000',
        decimals: 6,
      }),
    ).toBe('+1.5');
  });

  it('presents an outgoing transfer as a signed debit', () => {
    expect(getTransactionIconName({ direction: 'out' })).toBe('arrow-up');
    expect(getTransactionColor({ direction: 'out' })).toBe(colors.textPrimary);
    expect(getTransactionTitle({ direction: 'out' })).toBe('Sent');
    expect(
      getTransactionAmount({
        direction: 'out',
        amountBaseUnits: '1500000',
        decimals: 6,
      }),
    ).toBe('-1.5');
  });
});
