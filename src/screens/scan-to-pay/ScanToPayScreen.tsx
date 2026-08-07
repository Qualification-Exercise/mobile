import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@app/navigation/types';
import { useStore } from '@shared/store';
import {
  AppIcon,
  HeaderCloseButton,
  ScreenContainer,
  colors,
  radii,
  spacing,
  QrPlaceholder,
} from '@shared/ui';

const MERCHANT = {
  name: 'Café Nero — Milan',
  network: 'Dynamic QR · Arbitrum',
  amount: 25.0,
  currency: 'USDt',
  assetId: 'usdt-arbitrum',
};

export function ScanToPayScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { walletStore } = useStore();

  function handlePay() {
    walletStore.recordScanToPayment(
      MERCHANT.name,
      MERCHANT.amount,
      MERCHANT.assetId,
    );
    navigation.navigate('PaymentSuccess');
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <HeaderCloseButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Scan to pay</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.viewfinderWrapper}>
          <Text style={styles.hint}>Point at a merchant's payment QR</Text>
          <View style={styles.viewfinder}>
            <QrPlaceholder size={182} />
          </View>
        </View>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <View style={styles.merchantIcon}>
              <AppIcon
                name="storefront-outline"
                size={18}
                color={colors.textPrimary}
              />
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{MERCHANT.name}</Text>
              <Text style={styles.merchantNetwork}>{MERCHANT.network}</Text>
            </View>
            <View style={styles.merchantAmount}>
              <Text style={styles.amountValue}>
                {MERCHANT.amount.toFixed(2)}
              </Text>
              <Text style={styles.amountCurrency}>{MERCHANT.currency}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.payButton}
            onPress={handlePay}
            activeOpacity={0.85}
          >
            <Text style={styles.payLabel}>
              Pay {MERCHANT.amount.toFixed(2)} {MERCHANT.currency}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  viewfinderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  hint: {
    color: colors.textPrimary,
    fontSize: 13.5,
    textAlign: 'center',
  },
  viewfinder: {
    borderWidth: 4,
    borderColor: colors.accentBright,
    borderRadius: radii.sm,
    padding: 12,
  },
  summary: {
    backgroundColor: 'rgba(11,14,17,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(45,190,140,0.25)',
    borderRadius: radii.xxl,
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  merchantIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  merchantNetwork: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  merchantAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  amountCurrency: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  payButton: {
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  payLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
});
