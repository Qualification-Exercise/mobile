import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import {
  PrimaryButton,
  ScreenContainer,
  HeaderBackButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { CouponRow } from '@widgets/coupon-row';

export const RewardsScreen = observer(function RewardsScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore } = useStore();
  const claimableCount = walletStore.coupons.filter(
    coupon => coupon.status === 'Claimable',
  ).length;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Rewards</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Claimable cashback</Text>
        <Text style={styles.totalValue}>
          {walletStore.claimableCashbackTotal.toFixed(2)}{' '}
          <Text style={styles.totalUnit}>UTL</Text>
        </Text>
        <Text style={styles.totalCount}>Across {claimableCount} coupons</Text>
      </View>
      <Text style={styles.sectionTitle}>Coupons</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {walletStore.coupons.map(coupon => (
          <CouponRow key={coupon.code} coupon={coupon} />
        ))}
      </ScrollView>
      <PrimaryButton
        title={`Claim all — ${walletStore.claimableCashbackTotal.toFixed(
          2,
        )} UTL`}
        onPress={() => navigation.navigate('ClaimCoupon')}
      />
    </ScreenContainer>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  totalCard: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(45,190,140,0.22)',
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  totalUnit: {
    color: '#8B5CF6',
  },
  totalCount: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C4CCD4',
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.xs,
  },
});
