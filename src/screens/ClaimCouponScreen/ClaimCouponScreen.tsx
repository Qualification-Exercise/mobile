import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import { useStore } from '@shared/store';
import {
  ScreenContainer,
  HeaderBackButton,
  PrimaryButton,
  colors,
  radii,
  spacing,
} from '@shared/ui';

function splitCode(code?: string): [string, string] {
  if (!code) {
    return ['', ''];
  }
  const parts = code.split('-');
  return [parts[1] ?? '', parts[2] ?? ''];
}

export const ClaimCouponScreen = observer(function ClaimCouponScreenView() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ClaimCoupon'>>();

  const { walletStore } = useStore();
  const [initialSegmentA, initialSegmentB] = splitCode(params?.couponCode);
  const [segmentA, setSegmentA] = useState(initialSegmentA);
  const [segmentB, setSegmentB] = useState(initialSegmentB);

  const code = `WDK-${segmentA}-${segmentB}`.toUpperCase();
  const coupon = walletStore.coupons.find(c => c.code === code);
  const canClaim = !!coupon && coupon.status === 'Claimable';

  function handleClaim() {
    if (!coupon) {
      return;
    }
    walletStore.claimCoupon(coupon.code);
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Claim UTL</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.container}>
        <Text style={styles.description}>
          Redeem your cashback coupon for UTL, sent straight to your wallet.
        </Text>
        <View style={styles.codeRow}>
          <View style={styles.codeSegmentStatic}>
            <Text style={styles.codeText}>WDK</Text>
          </View>
          <Text style={styles.codeDash}>-</Text>
          <TextInput
            style={styles.codeSegmentInput}
            value={segmentA}
            onChangeText={value => setSegmentA(value.toUpperCase())}
            autoCapitalize="characters"
            maxLength={4}
          />
          <Text style={styles.codeDash}>-</Text>
          <TextInput
            style={styles.codeSegmentInput}
            value={segmentB}
            onChangeText={value => setSegmentB(value.toUpperCase())}
            autoCapitalize="characters"
            maxLength={2}
          />
        </View>
        <View style={styles.detailCard}>
          <View style={[styles.detailRow, styles.detailRowBorder]}>
            <Text style={styles.detailLabel}>You'll receive</Text>
            <Text style={styles.detailValueStrong}>
              {(coupon?.amount ?? 0).toFixed(2)} UTL
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contract</Text>
            <Text style={styles.detailValueMono}>0xUTL…a91</Text>
          </View>
        </View>
        <View style={styles.spacer} />
        <PrimaryButton
          title={`Claim ${(coupon?.amount ?? 0).toFixed(2)} UTL`}
          onPress={handleClaim}
          disabled={!canClaim}
        />
      </View>
    </ScreenContainer>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  container: {
    flex: 1,
  },
  description: {
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  codeSegmentStatic: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  codeText: {
    fontFamily: 'Menlo',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.textPrimary,
  },
  codeDash: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  codeSegmentInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontFamily: 'Menlo',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailLabel: {
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  detailValueStrong: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailValueMono: {
    fontFamily: 'Menlo',
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  spacer: {
    flex: 1,
  },
});
