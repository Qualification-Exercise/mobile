import { colors } from '@shared/ui';
import type { Asset } from './Asset';

const ASSET_DISPLAY: Record<string, { icon: string; color: string }> = {
  BTC: { icon: '₿', color: '#F7931A' },
  USDt: { icon: '₮', color: '#26A17B' },
  UTL: { icon: 'U', color: '#8B5CF6' },
};

export function getAssetIcon(asset: Pick<Asset, 'symbol'>): string {
  return ASSET_DISPLAY[asset.symbol]?.icon ?? asset.symbol.charAt(0);
}

export function getAssetColor(asset: Pick<Asset, 'symbol'>): string {
  return ASSET_DISPLAY[asset.symbol]?.color ?? colors.textSecondary;
}
