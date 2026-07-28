import { colors } from '@shared/ui';
import type { Asset } from './Asset';

const ASSET_DISPLAY: Record<
  string,
  { icon: string; color: string; glyphColor: string }
> = {
  BTC: { icon: '₿', color: '#F7931A', glyphColor: '#1A1200' },
  USDt: { icon: '₮', color: '#26A17B', glyphColor: '#04120D' },
  UTL: { icon: 'U', color: '#8B5CF6', glyphColor: colors.textPrimary },
};

export function getAssetIcon(asset: Pick<Asset, 'symbol'>): string {
  return ASSET_DISPLAY[asset.symbol]?.icon ?? asset.symbol.charAt(0);
}

export function getAssetColor(asset: Pick<Asset, 'symbol'>): string {
  return ASSET_DISPLAY[asset.symbol]?.color ?? colors.textSecondary;
}

export function getAssetGlyphColor(asset: Pick<Asset, 'symbol'>): string {
  return ASSET_DISPLAY[asset.symbol]?.glyphColor ?? colors.textPrimary;
}
