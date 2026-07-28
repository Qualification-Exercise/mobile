import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { Asset } from '@entities/asset';
import { PrimaryButton, colors, radii, spacing } from '@shared/ui';
import { AmountEntry } from '@widgets/amount-entry';

type SendAssetProps = {
  asset: Asset;
  onReview: (params: { amount: number; destination: string }) => void;
};

export function SendAsset({ asset, onReview }: SendAssetProps) {
  const [amount, setAmount] = useState(0);
  const [destination, setDestination] = useState('');

  function handleQuickFill(fraction: number) {
    setAmount(Number((asset.balance * fraction).toFixed(2)));
  }

  const canReview = amount > 0 && destination.trim().length > 0;

  return (
    <View style={styles.container}>
      <AmountEntry
        amount={amount.toFixed(2)}
        helperText={`≈ $${amount.toFixed(
          2,
        )} · Balance ${asset.balance.toLocaleString()}`}
        onQuickFill={handleQuickFill}
      />
      <Text style={styles.label}>To</Text>
      <View style={styles.destinationRow}>
        <TextInput
          style={styles.destinationInput}
          value={destination}
          onChangeText={setDestination}
          placeholder="Destination address"
          placeholderTextColor={colors.textTertiary}
        />
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Network</Text>
        <Text style={styles.detailValue}>{asset.network}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Network fee</Text>
        <Text style={styles.detailValue}>≈ $0.02</Text>
      </View>
      <View style={styles.spacer} />
      <PrimaryButton
        title="Review send"
        onPress={() => onReview({ amount, destination })}
        disabled={!canReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
  },
  destinationInput: {
    flex: 1,
    fontFamily: 'Menlo',
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  detailLabel: {
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  spacer: {
    flex: 1,
  },
});
