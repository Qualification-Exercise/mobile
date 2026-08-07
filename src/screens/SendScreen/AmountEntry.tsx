import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '@shared/ui';

type AmountEntryProps = {
  amount: string;
  helperText?: string;
  onQuickFill: (fraction: number) => void;
};

const QUICK_FILLS: Array<{ label: string; fraction: number }> = [
  { label: '25%', fraction: 0.25 },
  { label: '50%', fraction: 0.5 },
  { label: 'Max', fraction: 1 },
];

export function AmountEntry({
  amount,
  helperText,
  onQuickFill,
}: AmountEntryProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Amount</Text>
      <Text style={styles.amount}>{amount}</Text>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      <View style={styles.quickFillRow}>
        {QUICK_FILLS.map(({ label, fraction }) => (
          <TouchableOpacity
            key={label}
            style={styles.pill}
            onPress={() => onQuickFill(fraction)}
            activeOpacity={0.8}
          >
            <Text style={styles.pillLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  amount: {
    fontSize: 46,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  helper: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickFillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  pillLabel: {
    fontSize: 12.5,
    color: colors.textPrimary,
  },
});
