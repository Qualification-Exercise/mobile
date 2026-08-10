import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fromBaseUnits } from '@shared/lib';
import {
  formatFiat,
  getAssetColor,
  getAssetGlyphColor,
  getAssetIcon,
  getFiatValue,
} from '@shared/store/models/asset';
import type { Asset } from '@shared/store/models/asset';
import { colors, radii, spacing } from '@shared/ui';

type AssetRowProps = {
  asset: Asset;
  // Live base-unit balance from `useAssetBalances()`; undefined while loading
  // or on a per-asset fetch failure.
  balanceBaseUnits?: string;
  // USD per whole unit, or null when the feed has no market for the asset.
  price?: number | null;
  onPress?: () => void;
};

export function AssetRow({
  asset,
  balanceBaseUnits,
  price = null,
  onPress,
}: AssetRowProps) {
  const balanceDisplay =
    balanceBaseUnits != null
      ? fromBaseUnits(balanceBaseUnits, asset.decimals)
      : '—';
  const fiatValue = getFiatValue(balanceBaseUnits, asset.decimals, price);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.icon, { backgroundColor: getAssetColor(asset) }]}>
        <Text style={[styles.iconGlyph, { color: getAssetGlyphColor(asset) }]}>
          {getAssetIcon(asset)}
        </Text>
      </View>
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
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontWeight: '700',
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  network: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fiat: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  values: {
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
