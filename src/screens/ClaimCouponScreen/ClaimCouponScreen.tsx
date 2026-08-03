import { StyleSheet, Text, View } from 'react-native';
import { ClaimCoupon } from '@features/claim-coupon';
import { ScreenContainer, HeaderBackButton, colors, spacing } from '@shared/ui';

type ClaimCouponScreenProps = {
  couponCode?: string;
  onBack: () => void;
  onClaimed?: (code: string) => void;
};

export function ClaimCouponScreen({
  couponCode,
  onBack,
  onClaimed,
}: ClaimCouponScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>Claim UTL</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ClaimCoupon initialCode={couponCode} onClaimed={onClaimed} />
    </ScreenContainer>
  );
}

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
});
