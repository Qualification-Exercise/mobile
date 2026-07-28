import { StyleSheet, Text, View } from 'react-native';
import {
  getTransactionColor,
  getTransactionIcon,
  getTransactionTitle,
} from '@entities/transaction';
import type { Transaction } from '@entities/transaction';
import { colors, radii, spacing } from '@shared/ui';

type TransactionRowProps = {
  transaction: Transaction;
};

export function TransactionRow({ transaction }: TransactionRowProps) {
  const color = getTransactionColor(transaction);
  const sign = transaction.amount >= 0 ? '+' : '-';

  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Text style={[styles.iconGlyph, { color }]}>
          {getTransactionIcon(transaction)}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{getTransactionTitle(transaction)}</Text>
        <Text style={styles.subtitle}>{transaction.counterparty}</Text>
      </View>
      <View style={styles.values}>
        <Text style={[styles.amount, { color }]}>
          {sign}
          {Math.abs(transaction.amount).toFixed(2)}
        </Text>
        <Text style={styles.date}>{transaction.date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  values: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  date: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
