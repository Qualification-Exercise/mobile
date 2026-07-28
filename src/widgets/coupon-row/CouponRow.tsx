import { StyleSheet, Text, View } from 'react-native';
import type { Coupon } from '@entities/coupon';
import { colors, radii, spacing } from '@shared/ui';

type CouponRowProps = {
  coupon: Coupon;
};

export function CouponRow({ coupon }: CouponRowProps) {
  const statusColor =
    coupon.status === 'Claimable' ? colors.positive : colors.textTertiary;

  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Text style={styles.iconGlyph}>◆</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.code}>{coupon.code}</Text>
        <Text style={styles.merchant}>{coupon.merchant}</Text>
      </View>
      <View style={styles.values}>
        <Text style={styles.amount}>{coupon.amount.toFixed(2)} UTL</Text>
        <Text style={[styles.status, { color: statusColor }]}>
          {coupon.status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.xs,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  info: {
    flex: 1,
  },
  code: {
    fontFamily: 'Menlo',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textPrimary,
  },
  merchant: {
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
    color: colors.textPrimary,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
