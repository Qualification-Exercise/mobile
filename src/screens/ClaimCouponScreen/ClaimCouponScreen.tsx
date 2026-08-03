import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import { ClaimCoupon } from '@features/claim-coupon';
import { ScreenContainer, colors, spacing } from '@shared/ui';

export function ClaimCouponScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ClaimCoupon'>>();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
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
  back: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 22,
  },
});
