import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@app/navigation/types';
import {
  AppIcon,
  PrimaryButton,
  ScreenContainer,
  colors,
  spacing,
} from '@shared/ui';

// Shorten a broadcast hash for display, e.g. `0x9f2a…d41c`.
function shortenHash(hash: string): string {
  if (hash.length <= 12) {
    return hash;
  }
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  failed: 'Failed',
};

export const PaymentSuccessScreen = observer(
  function PaymentSuccessScreenView() {
    const navigation = useNavigation<RootStackNavigationProp>();
    const { assetSymbol, amount, hash, status } =
      useRoute<RouteProp<RootStackParamList, 'PaymentSuccess'>>().params;

    return (
      <ScreenContainer>
        <View style={styles.content}>
          <View style={styles.checkCircle}>
            <AppIcon name="checkmark" size={44} color={colors.background} />
          </View>
          <Text style={styles.title}>Transaction sent</Text>
          <Text style={styles.subtitle}>
            {amount} {assetSymbol}
          </Text>
          {hash ? (
            <Text style={styles.txHash}>
              tx {shortenHash(hash)}
              {status ? ` · ${STATUS_LABEL[status] ?? status}` : ''}
            </Text>
          ) : null}

          {/* Cashback is accrued server-side once the payment reaches
              confirmation depth, so no coupon exists to show yet. */}
          <Text style={styles.cashbackHint}>
            If this paid a participating merchant, your cashback coupon appears
            under Rewards once the payment confirms.
          </Text>

          <View style={styles.spacer} />

          <View style={styles.actions}>
            <PrimaryButton title="Done" onPress={() => navigation.popToTop()} />
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
  cashbackHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
    lineHeight: 19,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
});
