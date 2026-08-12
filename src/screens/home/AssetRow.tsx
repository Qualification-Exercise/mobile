import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatAmount } from '@shared/lib';
import { formatFiat, getFiatValue } from '@shared/store/models/asset';
import type { Asset } from '@shared/store/models/asset';
import { AssetIcon, colors, spacing, typography } from '@shared/ui';

type AssetRowProps = {
  asset: Asset;
  // Live base-unit balance from `useAssetBalances()`; undefined while loading
  // or on a per-asset fetch failure.
  balanceBaseUnits?: string;
  // USD per whole unit, or null when the feed has no market for the asset.
  price?: number | null;
  divided?: boolean;
  onPress?: () => void;
};

export function AssetRow({
  asset,
  balanceBaseUnits,
  price = null,
  divided,
  onPress,
}: AssetRowProps) {
  const balanceDisplay =
    balanceBaseUnits != null
      ? formatAmount(balanceBaseUnits, asset.decimals)
      : '—';
  const fiatValue = getFiatValue(balanceBaseUnits, asset.decimals, price);

  return (
    <TouchableOpacity
      style={[styles.row, divided && styles.rowDivided]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
    >
      <AssetIcon symbol={asset.symbol} />
      <View style={styles.info}>
        <Text style={styles.name}>{asset.name}</Text>
        {/* The network is the group heading on the list, so the row shows the
            ticker instead of repeating it. */}
        <Text style={styles.network}>{asset.symbol}</Text>
      </View>
      <View style={styles.values}>
        <Text style={styles.balance}>
          {balanceDisplay} {asset.symbol}
        </Text>
        {fiatValue != null ? (
          <Text style={styles.fiat}>{formatFiat(fiatValue)}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  network: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fiat: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  values: {
    alignItems: 'flex-end',
  },
  balance: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
