import { StyleSheet, Text, View } from 'react-native';
import {
  getCouponAmount,
  getCouponStatusColor,
  getCouponStatusLabel,
  getCouponSubtitle,
  type Coupon,
} from '@shared/store/models/coupon';
import { AppIcon, colors, radii, spacing } from '@shared/ui';

type CouponRowProps = {
  coupon: Coupon;
};

export function CouponRow({ coupon }: CouponRowProps) {
  const statusColor = getCouponStatusColor(coupon);

  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <AppIcon name="gift-outline" size={18} color={colors.textPrimary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.code}>{coupon.code ?? 'Pending coupon'}</Text>
        <Text style={styles.merchant}>{getCouponSubtitle(coupon)}</Text>
      </View>
      <View style={styles.values}>
        <Text style={styles.amount}>{getCouponAmount(coupon)} UTL</Text>
        <Text style={[styles.status, { color: statusColor }]}>
          {getCouponStatusLabel(coupon)}
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
