import { fromBaseUnits } from '@shared/lib';
import { colors } from '@shared/ui';
import type { Asset } from './Asset';

const ASSET_DISPLAY: Record<
  string,
  { icon: string; color: string; glyphColor: string }
> = {
  BTC: { icon: '₿', color: '#F7931A', glyphColor: '#1A1200' },
  USDt: { icon: '₮', color: '#26A17B', glyphColor: '#04120D' },
  UTL: { icon: 'U', color: '#8B5CF6', glyphColor: colors.textPrimary },
  ETH: { icon: 'Ξ', color: '#627EEA', glyphColor: colors.textPrimary },
  POL: { icon: '⬡', color: '#7B3FE4', glyphColor: colors.textPrimary },
  TRX: { icon: 'T', color: '#EB0029', glyphColor: colors.textPrimary },
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

// The USD worth of a base-unit balance at `price` per whole unit, or null when
// either side is unknown. Display-only: the balance keeps its full precision
// in base units, this is what the number is worth.
export function getFiatValue(
  balanceBaseUnits: string | undefined,
  decimals: number,
  price: number | null,
): number | null {
  if (balanceBaseUnits == null || price == null) {
    return null;
  }
  const amount = Number(fromBaseUnits(balanceBaseUnits, decimals));
  return Number.isFinite(amount) ? amount * price : null;
}

export function formatFiat(value: number | null): string {
  return value == null ? '—' : `$${value.toFixed(2)}`;
}
