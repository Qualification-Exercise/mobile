import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fromBaseUnits } from '@shared/lib';
import {
  getAssetColor,
  getAssetGlyphColor,
  getAssetIcon,
} from '@shared/store/models/asset';
import type { Asset } from '@shared/store/models/asset';
import { colors, radii, spacing } from '@shared/ui';

type AssetRowProps = {
  asset: Asset;
  // Live base-unit balance from `useAssetBalances()`; undefined while loading
  // or on a per-asset fetch failure.
  balanceBaseUnits?: string;
  onPress?: () => void;
};

export function AssetRow({ asset, balanceBaseUnits, onPress }: AssetRowProps) {
  const balanceDisplay =
    balanceBaseUnits != null
      ? fromBaseUnits(balanceBaseUnits, asset.decimals)
      : '—';

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
        <Text style={styles.network}>{asset.network}</Text>
      </View>
      <View style={styles.values}>
        <Text style={styles.balance}>
          {balanceDisplay} {asset.symbol}
        </Text>
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
  values: {
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
