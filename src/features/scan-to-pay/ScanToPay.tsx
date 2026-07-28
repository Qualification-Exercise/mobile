import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useStore } from '@shared/store';
import { colors, radii, spacing } from '@shared/ui';
import { QrPlaceholder } from '@widgets/qr-placeholder';

const MERCHANT = {
  name: 'Café Nero — Milan',
  network: 'Dynamic QR · Arbitrum',
  amount: 25.0,
  currency: 'USDt',
  assetId: 'usdt-arbitrum',
};

type ScanToPayProps = {
  onClose: () => void;
  onPaid: () => void;
};

export function ScanToPay({ onClose, onPaid }: ScanToPayProps) {
  const { walletStore } = useStore();

  function handlePay() {
    walletStore.recordScanToPayment(
      MERCHANT.name,
      MERCHANT.amount,
      MERCHANT.assetId,
    );
    onPaid();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
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
            <Text style={styles.merchantIconGlyph}>◧</Text>
          </View>
          <View style={styles.merchantInfo}>
            <Text style={styles.merchantName}>{MERCHANT.name}</Text>
            <Text style={styles.merchantNetwork}>{MERCHANT.network}</Text>
          </View>
          <View style={styles.merchantAmount}>
            <Text style={styles.amountValue}>{MERCHANT.amount.toFixed(2)}</Text>
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
  close: {
    fontSize: 22,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 22,
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
  merchantIconGlyph: {
    fontSize: 18,
    color: colors.textPrimary,
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
