import { Image, StyleSheet, Text, View } from 'react-native';
import {
  getAssetColor,
  getAssetGlyphColor,
  getAssetIcon,
  getAssetIconUrl,
} from '@shared/store/models/asset';
import { colors } from './tokens';

type AssetIconProps = {
  symbol: string;
  size?: number;
};

export function AssetIcon({ symbol, size = 40 }: AssetIconProps) {
  const asset = { symbol };
  const uri = getAssetIconUrl(asset);
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri != null) {
    return <Image source={{ uri }} style={[styles.ring, shape]} />;
  }

  return (
    <View
      style={[
        styles.fallback,
        styles.ring,
        shape,
        { backgroundColor: getAssetColor(asset) },
      ]}
    >
      <Text
        style={[
          styles.glyph,
          { fontSize: size * 0.4, color: getAssetGlyphColor(asset) },
        ]}
      >
        {getAssetIcon(asset)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  glyph: {
    fontWeight: '700',
  },
});
