import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { formatUtl } from '@shared/store/models/coupon';
import { useStore } from '@shared/store';
import {
  PrimaryButton,
  ScreenContainer,
  HeaderBackButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';
import { CouponRow } from './CouponRow';

export const RewardsScreen = observer(function RewardsScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore } = useStore();
  const claimable = walletStore.claimableCoupons;
  const total = formatUtl(walletStore.claimableCashbackTotal);

  // Coupons are accrued server-side from confirmed payments, so the list is
  // re-read every time this screen comes into focus rather than cached.
  useFocusEffect(
    useCallback(() => {
      walletStore.loadCoupons();
    }, [walletStore]),
  );

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
          {total} <Text style={styles.totalUnit}>UTL</Text>
        </Text>
        <Text style={styles.totalCount}>Across {claimable.length} coupons</Text>
      </View>
      <Text style={styles.sectionTitle}>Coupons</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={walletStore.couponsRequest.loading}
            onRefresh={() => walletStore.loadCoupons()}
            tintColor={colors.textSecondary}
          />
        }
      >
        {walletStore.couponsRequest.error ? (
          <Text style={styles.empty}>{walletStore.couponsRequest.error}</Text>
        ) : null}
        {walletStore.coupons.length === 0 &&
        !walletStore.couponsRequest.loading ? (
          <Text style={styles.empty}>
            No cashback yet. Pay a merchant to earn a coupon.
          </Text>
        ) : null}
        {walletStore.coupons.map(coupon => (
          <CouponRow key={coupon.id} coupon={coupon} />
        ))}
      </ScrollView>
      <PrimaryButton
        // One claim is signed at a time: each needs its own challenge and
        // signature, and the backend allows one claim per cooldown window.
        title={`Claim ${total} UTL`}
        onPress={() =>
          navigation.navigate('ClaimCoupon', {
            couponCode: claimable[0]?.code ?? undefined,
          })
        }
        disabled={claimable.length === 0}
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
  empty: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
