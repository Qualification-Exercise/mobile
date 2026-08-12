import { StyleSheet, Text, View } from 'react-native';
import {
  getTransactionAmount,
  getTransactionColor,
  getTransactionIconName,
  getTransactionTitle,
} from '@shared/store/models/transaction';
import type { Transaction } from '@shared/store/models/transaction';
import { AppIcon, colors, radii, spacing, typography } from '@shared/ui';

type TransactionRowProps = {
  transaction: Transaction;
  divided?: boolean;
};

export function TransactionRow({ transaction, divided }: TransactionRowProps) {
  const color = getTransactionColor(transaction);

  return (
    <View style={[styles.row, divided && styles.rowDivided]}>
      <View style={styles.icon}>
        <AppIcon
          name={getTransactionIconName(transaction)}
          size={18}
          color={color}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{getTransactionTitle(transaction)}</Text>
        <Text style={styles.subtitle}>{transaction.counterparty}</Text>
      </View>
      <View style={styles.values}>
        <Text style={[styles.amount, { color }]}>
          {getTransactionAmount(transaction)}
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
    paddingVertical: spacing.lg,
  },
  rowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  values: {
    alignItems: 'flex-end',
  },
  amount: {
    ...typography.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  date: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
