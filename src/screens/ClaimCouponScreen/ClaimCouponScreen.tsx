import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import { ClaimCoupon } from '@features/claim-coupon';
import { ScreenContainer, HeaderBackButton, colors, spacing } from '@shared/ui';

export function ClaimCouponScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ClaimCoupon'>>();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Claim UTL</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ClaimCoupon initialCode={params?.couponCode} />
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
