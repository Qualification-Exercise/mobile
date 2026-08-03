import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useStore } from '@shared/store';
import { colors, radii, spacing } from '@shared/ui';

type ApproveTransactionProps = {
  assetId: string;
  assetSymbol: string;
  amount: number;
  destination: string;
  network: string;
  fee?: string;
};

export function ApproveTransaction({
  assetId,
  assetSymbol,
  amount,
  destination,
  network,
  fee = '≈ $0.02',
}: ApproveTransactionProps) {
  const { walletStore, biometryStore } = useStore();

  async function verifyTransaction() {
    const outcome = await biometryStore.verify('Confirm transaction');

    switch (outcome) {
      case 'unlocked':
        walletStore.sendAsset(assetId, amount, destination);
        return;
      case 'permission-denied':
      case 'unavailable':
      case 'failed':
        Alert.alert(
          'Face ID unavailable',
          'We could not verify your biometrics. Make sure Face ID is set up on this device, then try again.',
        );
        return;
    }
  }

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>Confirm transaction</Text>
      <View style={styles.summary}>
        <View style={[styles.row, styles.rowBorder]}>
          <Text style={styles.rowLabel}>Send</Text>
          <Text style={styles.rowValueStrong}>
            {amount.toFixed(2)} {assetSymbol}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>To</Text>
          <Text style={styles.rowValueMono}>{destination}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Network</Text>
          <Text style={styles.rowValue}>{network}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Fee</Text>
          <Text style={styles.rowValue}>{fee}</Text>
        </View>
      </View>
      <View style={styles.biometricRow}>
        <View style={styles.biometricFrame}>
          <View style={styles.biometricInner} />
        </View>
        <Text style={styles.biometricLabel}>Confirm with Face ID to sign</Text>
      </View>
      <TouchableOpacity
        style={[styles.confirmButton]}
        onLongPress={verifyTransaction}
        delayLongPress={600}
        activeOpacity={0.85}
      >
        <Text style={styles.confirmLabel}>Verify</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.xl,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  summary: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowLabel: {
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowValueStrong: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  rowValueMono: {
    fontFamily: 'Menlo',
    fontSize: 13,
    color: colors.textPrimary,
  },
  biometricRow: {
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  biometricFrame: {
    width: 66,
    height: 66,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.accentBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricInner: {
    width: 28,
    height: 28,
    borderRadius: radii.xs - 4,
    borderWidth: 2,
    borderColor: colors.accentBright,
  },
  biometricLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.positive,
  },
  confirmButton: {
    height: 54,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonBusy: {
    opacity: 0.6,
  },
  confirmLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
});
