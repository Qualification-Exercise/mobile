import { fromBaseUnits } from '@shared/lib';
import type { AppIconName } from '@shared/ui';
import { colors } from '@shared/ui';
import type { Transaction } from './Transaction';

export function getTransactionIconName(
  transaction: Pick<Transaction, 'direction'>,
): AppIconName {
  return transaction.direction === 'in' ? 'arrow-down' : 'arrow-up';
}

export function getTransactionColor(
  transaction: Pick<Transaction, 'direction'>,
): string {
  return transaction.direction === 'in' ? colors.positive : colors.textPrimary;
}

export function getTransactionTitle(
  transaction: Pick<Transaction, 'direction'>,
): string {
  return transaction.direction === 'in' ? 'Received' : 'Sent';
}

// Signed, human-readable amount, e.g. `-25.5`.
export function getTransactionAmount(
  transaction: Pick<Transaction, 'direction' | 'amountBaseUnits' | 'decimals'>,
): string {
  const value = fromBaseUnits(
    transaction.amountBaseUnits,
    transaction.decimals,
  );
  return `${transaction.direction === 'in' ? '+' : '-'}${value}`;
}
