import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import {
  Clipboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import {
  PrimaryButton,
  ScreenContainer,
  colors,
  radii,
  spacing,
} from '@shared/ui';

export const PaymentSuccessScreen = observer(
  function PaymentSuccessScreenView() {
    const navigation = useNavigation<RootStackNavigationProp>();
    const { walletStore } = useStore();
    const transaction = walletStore.transactions[0];
    const coupon = walletStore.coupons[0];
    const cashbackPercent = Math.round(
      (coupon.amount / Math.abs(transaction.amount)) * 100,
    );

    return (
      <ScreenContainer>
        <View style={styles.content}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkGlyph}>✓</Text>
          </View>
          <Text style={styles.title}>Payment sent</Text>
          <Text style={styles.subtitle}>
            {Math.abs(transaction.amount).toFixed(2)} USDt to{' '}
            {transaction.counterparty}
          </Text>
          <Text style={styles.txHash}>tx 0x9f2a…d41c · Confirmed</Text>

          <View style={styles.cashbackCard}>
            <View style={styles.cashbackHeader}>
              <View style={styles.cashbackIcon}>
                <Text style={styles.cashbackIconGlyph}>◆</Text>
              </View>
              <Text style={styles.cashbackLabel}>Cashback earned</Text>
            </View>
            <Text style={styles.cashbackPercent}>{cashbackPercent}% back</Text>
            <Text style={styles.cashbackAmount}>
              Coupon issued for {coupon.amount.toFixed(2)} UTL
            </Text>
            <View style={styles.couponRow}>
              <Text style={styles.couponCode}>{coupon.code}</Text>
              <TouchableOpacity
                onPress={() => Clipboard.setString(coupon.code)}
              >
                <Text style={styles.couponCopy}>⧉ Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.spacer} />

          <View style={styles.actions}>
            <PrimaryButton
              title="Claim UTL now"
              onPress={() =>
                navigation.navigate('ClaimCoupon', { couponCode: coupon.code })
              }
            />
            <TouchableOpacity onPress={() => navigation.popToTop()}>
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  txHash: {
    fontFamily: 'Menlo',
    fontSize: 11.5,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  cashbackCard: {
    width: '100%',
    marginTop: spacing.xxxl,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(45,190,140,0.28)',
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  cashbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cashbackIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.xs - 3,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashbackIconGlyph: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cashbackLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.positive,
  },
  cashbackPercent: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  cashbackAmount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  couponRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.14)',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  couponCode: {
    fontFamily: 'Menlo',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.textPrimary,
  },
  couponCopy: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentBright,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  done: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
  },
});
