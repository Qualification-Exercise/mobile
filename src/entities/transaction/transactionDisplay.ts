import { colors } from '@shared/ui';
import type { Transaction } from './Transaction';

export function getTransactionIcon(
  transaction: Pick<Transaction, 'direction'>,
): string {
  return transaction.direction === 'in' ? '↓' : '↑';
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
